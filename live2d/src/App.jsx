
import { useEffect, useRef, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  // 음성 인식 상태
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  // SpeechRecognition 객체
  const recognitionRef = useRef(null)

  // 음성 인식 중 누적된 문장
  const finalTranscriptRef = useRef('')

  // 중복 요청 방지
  const isSendingRef = useRef(false)

  // =========================================================
  // Live2D 초기화
  // =========================================================

  useEffect(() => {
    const delegate = LAppDelegate.getInstance()

    if (!delegate.initialize()) {
      console.error('Live2D 초기화 실패')
      return
    }

    delegate.run()

    // =======================================================
    // 음성 인식 초기화
    // =======================================================

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn(
        '이 브라우저는 음성 인식을 지원하지 않습니다.'
      )

      setSpeechSupported(false)
    } else {
      const recognition = new SpeechRecognition()

      // 한국어 인식
      recognition.lang = 'ko-KR'

      // 중간 결과도 받음
      recognition.interimResults = true

      // 한 번 말할 때 계속 인식
      recognition.continuous = false

      recognition.onstart = () => {
        console.log('🎤 음성 인식 시작')
        setIsListening(true)

        finalTranscriptRef.current = ''
      }

      recognition.onresult = (event) => {
        let finalText = ''
        let interimText = ''

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const transcript =
            event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalText += transcript
          } else {
            interimText += transcript
          }
        }

        // 확정된 음성
        if (finalText) {
          finalTranscriptRef.current += finalText
        }

        // 화면 입력창에 현재 인식 결과 표시
        setInput(
          finalTranscriptRef.current +
            interimText
        )
      }

      // =====================================================
      // 사용자가 말을 끝냈을 때
      // =====================================================

      recognition.onend = () => {
        console.log('🎤 음성 인식 종료')

        setIsListening(false)

        const text =
          finalTranscriptRef.current.trim()

        console.log(
          '🎤 최종 인식 문장:',
          text
        )

        // 음성이 실제로 인식되었다면
        // 자동으로 AI에게 전송
        if (text) {
          sendMessage(text)
        }
      }

      recognition.onerror = (event) => {
        console.error(
          '🎤 음성 인식 오류:',
          event.error
        )

        setIsListening(false)

        // 사용자가 말을 안 했을 때는
        // 별도 오류 메시지를 만들지 않음
        if (
          event.error === 'not-allowed'
        ) {
          alert(
            '마이크 사용 권한을 허용해주세요.'
          )
        }
      }

      recognitionRef.current = recognition
    }

    // =======================================================
    // Cleanup
    // =======================================================

    return () => {
      window.speechSynthesis.cancel()

      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      LAppDelegate.releaseInstance()
    }
  }, [])


  // =========================================================
  // Live2D 표정 변경
  // =========================================================

  const changeExpression = (expressionId) => {
    const delegate =
      LAppDelegate.getInstance()

    delegate.setExpression(expressionId)
  }


  // =========================================================
  // Gemini 감정 → Live2D 표정
  // =========================================================

  const changeEmotion = (emotion) => {
    console.log(
      'Gemini 감정:',
      emotion
    )

    const expressionMap = {
      happy: 'F01',
      surprised: 'F02',
      sad: 'F03',
      angry: 'F04',
      thinking: 'F05',
      neutral: 'F01',
    }

    const expressionId =
      expressionMap[emotion] || 'F01'

    changeExpression(expressionId)
  }


  // =========================================================
  // AI 음성 출력
  // =========================================================

  const speakAI = (text) => {
    if (!window.speechSynthesis) {
      console.error(
        '이 브라우저는 음성 합성을 지원하지 않습니다.'
      )
      return
    }

    console.log(
      '🔊 AI 음성 출력 시작'
    )

    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(text)

    utterance.lang = 'ko-KR'

    utterance.rate = 1.05
    utterance.pitch = 1.25
    utterance.volume = 1.0

    const voices =
      window.speechSynthesis.getVoices()

    const koreanVoices =
      voices.filter((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('ko')
      )

    const femaleVoice =
      koreanVoices.find((voice) => {
        const name =
          voice.name.toLowerCase()

        return (
          name.includes('female') ||
          name.includes('woman') ||
          name.includes('여성') ||
          name.includes('girl')
        )
      })

    if (femaleVoice) {
      utterance.voice =
        femaleVoice
    } else if (
      koreanVoices.length > 0
    ) {
      utterance.voice =
        koreanVoices[0]
    }

    utterance.onstart = () => {
      console.log(
        '🔊 AI 음성 재생 시작'
      )
    }

    utterance.onend = () => {
      console.log(
        '🔊 AI 음성 재생 종료'
      )
    }

    utterance.onerror = (event) => {
      console.error(
        '🔊 음성 재생 오류:',
        event
      )
    }

    window.speechSynthesis.speak(
      utterance
    )
  }


  // =========================================================
  // 음성 질문 시작
  // =========================================================

  const startListening = () => {
    if (!recognitionRef.current) {
      alert(
        '이 브라우저에서는 음성 인식을 사용할 수 없습니다.'
      )

      return
    }

    // 이미 듣고 있다면 중지
    if (isListening) {
      recognitionRef.current.stop()
      return
    }

    // AI 음성이 나오고 있다면 중지
    window.speechSynthesis.cancel()

    // 이전 문장 초기화
    finalTranscriptRef.current = ''

    setInput('')

    try {
      recognitionRef.current.start()

      console.log(
        '🎤 마이크 듣기 시작'
      )
    } catch (error) {
      console.error(
        '음성 인식 시작 실패:',
        error
      )
    }
  }


  // =========================================================
  // AI 서버에 메시지 전송
  // =========================================================

  const sendMessage = async (text) => {
    const cleanText =
      text.trim()

    if (!cleanText) {
      return
    }

    // 중복 요청 방지
    if (isSendingRef.current) {
      return
    }

    isSendingRef.current = true

    // =======================================================
    // 사용자 메시지 추가
    // =======================================================

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: cleanText,
      },
    ])

    setInput('')

    try {
      // =====================================================
      // API 주소
      // =====================================================

      const API_URL =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/chat'
          : '/api/chat'

      // =====================================================
      // Gemini 서버 요청
      // =====================================================

      const response =
        await fetch(
          API_URL,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              message: cleanText,
            }),
          }
        )

      if (!response.ok) {
        throw new Error(
          '서버 응답 오류'
        )
      }

      const data =
        await response.json()

      console.log(
        '서버 응답:',
        data
      )

      console.log(
        'AI 답변:',
        data.reply
      )

      console.log(
        'AI 감정:',
        data.emotion
      )

      // =====================================================
      // AI 답변 화면 표시
      // =====================================================

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content: data.reply,
        },
      ])

      // =====================================================
      // 감정 → Live2D 표정
      // =====================================================

      changeEmotion(
        data.emotion
      )

      // =====================================================
      // AI 음성 출력
      // =====================================================

      speakAI(data.reply)

    } catch (error) {
      console.error(
        '채팅 요청 실패:',
        error
      )

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content:
            '서버와 연결할 수 없습니다.',
        },
      ])

      changeExpression('F03')

    } finally {
      isSendingRef.current = false
    }
  }


  // =========================================================
  // 텍스트 채팅 전송
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    const text =
      input.trim()

    if (!text) {
      return
    }

    // 음성 인식 중이라면 중지
    if (
      recognitionRef.current &&
      isListening
    ) {
      recognitionRef.current.stop()
    }

    await sendMessage(text)
  }


  // =========================================================
  // 화면
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          채팅 UI
      ===================================================== */}

      <div className="chat-container">

        <div className="chat-header">
          Live 2D AI
        </div>


        {/* ===================================================
            메시지
        =================================================== */}

        <div className="messages">

          {messages.length === 0 && (
            <div className="empty-message">
              AI에게 질문해보세요.
            </div>
          )}


          {messages.map(
            (message, index) => (
              <div
                key={index}
                className={`message ${message.role}`}
              >
                {message.content}
              </div>
            )
          )}

        </div>


        {/* ===================================================
            입력 영역
        =================================================== */}

        <form
          className="chat-input-area"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            placeholder={
              isListening
                ? '듣고 있습니다...'
                : '질문을 입력하세요...'
            }
          />


          {/* =================================================
              마이크 버튼
          ================================================= */}

          {speechSupported && (
            <button
              type="button"
              className={`mic-button ${
                isListening
                  ? 'listening'
                  : ''
              }`}
              onClick={
                startListening
              }
              title={
                isListening
                  ? '음성 인식 중지'
                  : '음성으로 질문'
              }
            >
              {isListening
                ? '■'
                : '🎤'}
            </button>
          )}


          {/* =================================================
              전송
          ================================================= */}

          <button type="submit">
            전송
          </button>

        </form>

      </div>


      {/* =====================================================
          표정 테스트 버튼
      ===================================================== */}

      <div className="expression-buttons">

        <button
          onClick={() =>
            changeExpression('F01')
          }
        >
          표정 1
        </button>

        <button
          onClick={() =>
            changeExpression('F02')
          }
        >
          표정 2
        </button>

        <button
          onClick={() =>
            changeExpression('F03')
          }
        >
          표정 3
        </button>

        <button
          onClick={() =>
            changeExpression('F04')
          }
        >
          표정 4
        </button>

        <button
          onClick={() =>
            changeExpression('F05')
          }
        >
          표정 5
        </button>

        <button
          onClick={() =>
            changeExpression('F06')
          }
        >
          표정 6
        </button>

        <button
          onClick={() =>
            changeExpression('F07')
          }
        >
          표정 7
        </button>

        <button
          onClick={() =>
            changeExpression('F08')
          }
        >
          표정 8
        </button>

      </div>

    </div>
  )
}

export default App

