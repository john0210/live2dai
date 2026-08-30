
import { useEffect, useRef, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  // =========================================================
  // 음성 인식 상태
  // =========================================================

  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  // =========================================================
  // SpeechRecognition
  // =========================================================

  const recognitionRef = useRef(null)

  // =========================================================
  // 음성 인식 최종 문장
  // =========================================================

  const finalTranscriptRef = useRef('')

  // =========================================================
  // 중복 요청 방지
  // =========================================================

  const isSendingRef = useRef(false)

  // =========================================================
  // 음성 인식 종료 후 자동 전송 중복 방지
  // =========================================================

  const autoSendRef = useRef(false)

  // =========================================================
  // 컴포넌트 종료 여부
  // =========================================================

  const isMountedRef = useRef(true)


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
    // SpeechRecognition 가져오기
    // =======================================================

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    // =======================================================
    // 음성 인식 미지원
    // =======================================================

    if (!SpeechRecognition) {
      console.warn(
        '이 브라우저는 음성 인식을 지원하지 않습니다.'
      )

      setSpeechSupported(false)

      return () => {
        isMountedRef.current = false

        window.speechSynthesis.cancel()

        LAppDelegate.releaseInstance()
      }
    }

    // =======================================================
    // SpeechRecognition 생성
    // =======================================================

    const recognition = new SpeechRecognition()

    recognition.lang = 'ko-KR'

    // 중간 결과 받기
    recognition.interimResults = true

    // 한 번의 질문 단위로 인식
    recognition.continuous = false

    // =======================================================
    // 음성 인식 시작
    // =======================================================

    recognition.onstart = () => {
      console.log('🎤 음성 인식 시작')

      setIsListening(true)

      finalTranscriptRef.current = ''
      autoSendRef.current = false
    }

    // =======================================================
    // 음성 인식 결과
    // =======================================================

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

      // =====================================================
      // 확정된 문장 저장
      // =====================================================

      if (finalText) {
        finalTranscriptRef.current += finalText
      }

      // =====================================================
      // 화면 입력창에 실시간 표시
      // =====================================================

      const currentText =
        finalTranscriptRef.current +
        interimText

      setInput(currentText)

      console.log(
        '🎤 현재 인식:',
        currentText
      )
    }

    // =======================================================
    // ★ 핵심
    // 사용자가 말을 끝내면 자동으로 AI에게 전송
    // =======================================================

    recognition.onend = () => {
      console.log('🎤 음성 인식 종료')

      setIsListening(false)

      const text =
        finalTranscriptRef.current.trim()

      console.log(
        '🎤 최종 인식 문장:',
        text
      )

      // =====================================================
      // 이미 자동 전송했다면 다시 보내지 않음
      // =====================================================

      if (autoSendRef.current) {
        return
      }

      // =====================================================
      // 실제 문장이 존재하면 자동 전송
      // =====================================================

      if (text) {
        autoSendRef.current = true

        console.log(
          '🤖 음성 질문 자동 전송:',
          text
        )

        // 아주 짧은 지연을 줘서
        // 모바일 브라우저의 recognition 종료 처리를 기다림
        setTimeout(() => {
          if (!isMountedRef.current) {
            return
          }

          sendMessage(text)
        }, 100)
      }
    }

    // =======================================================
    // 음성 인식 오류
    // =======================================================

    recognition.onerror = (event) => {
      console.error(
        '🎤 음성 인식 오류:',
        event.error
      )

      setIsListening(false)

      // =====================================================
      // 권한 거부
      // =====================================================

      if (event.error === 'not-allowed') {
        alert(
          '마이크 사용 권한을 허용해주세요.'
        )
      }

      // =====================================================
      // 음성 없음
      // =====================================================

      if (event.error === 'no-speech') {
        console.log(
          '🎤 음성이 감지되지 않았습니다.'
        )
      }

      // =====================================================
      // 네트워크 오류
      // =====================================================

      if (event.error === 'network') {
        console.error(
          '🎤 음성 인식 네트워크 오류'
        )
      }
    }

    // =======================================================
    // SpeechRecognition 저장
    // =======================================================

    recognitionRef.current = recognition

    // =======================================================
    // Cleanup
    // =======================================================

    return () => {
      isMountedRef.current = false

      window.speechSynthesis.cancel()

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log(
            '음성 인식 종료:',
            error
          )
        }
      }

      recognitionRef.current = null

      LAppDelegate.releaseInstance()
    }
  }, [])


  // =========================================================
  // Live2D 표정 변경
  // =========================================================

  const changeExpression = (expressionId) => {
    try {
      const delegate =
        LAppDelegate.getInstance()

      delegate.setExpression(expressionId)
    } catch (error) {
      console.error(
        'Live2D 표정 변경 실패:',
        error
      )
    }
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

    console.log(
      'Live2D 표정:',
      expressionId
    )

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

    if (!text) {
      return
    }

    console.log(
      '🔊 AI 음성 출력 시작'
    )

    // =====================================================
    // 기존 AI 음성 중지
    // =====================================================

    window.speechSynthesis.cancel()

    // =====================================================
    // 음성 객체
    // =====================================================

    const utterance =
      new SpeechSynthesisUtterance(text)

    // =====================================================
    // 한국어
    // =====================================================

    utterance.lang = 'ko-KR'

    // =====================================================
    // 말하기 속도 / 음높이
    // =====================================================

    utterance.rate = 1.05
    utterance.pitch = 1.25
    utterance.volume = 1.0

    // =====================================================
    // 사용 가능한 음성
    // =====================================================

    const voices =
      window.speechSynthesis.getVoices()

    console.log(
      '사용 가능한 음성:',
      voices
    )

    // =====================================================
    // 한국어 음성만 선택
    // =====================================================

    const koreanVoices =
      voices.filter((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('ko')
      )

    // =====================================================
    // 여성 음성 우선
    // =====================================================

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

    // =====================================================
    // 음성 선택
    // =====================================================

    if (femaleVoice) {
      console.log(
        '🔊 여성 음성 선택:',
        femaleVoice.name
      )

      utterance.voice =
        femaleVoice
    } else if (
      koreanVoices.length > 0
    ) {
      console.log(
        '🔊 한국어 음성 선택:',
        koreanVoices[0].name
      )

      utterance.voice =
        koreanVoices[0]
    } else {
      console.log(
        '🔊 한국어 음성을 찾지 못했습니다.'
      )
    }

    // =====================================================
    // 음성 시작
    // =====================================================

    utterance.onstart = () => {
      console.log(
        '🔊 AI 음성 재생 시작'
      )
    }

    // =====================================================
    // 음성 종료
    // =====================================================

    utterance.onend = () => {
      console.log(
        '🔊 AI 음성 재생 종료'
      )
    }

    // =====================================================
    // 음성 오류
    // =====================================================

    utterance.onerror = (event) => {
      console.error(
        '🔊 AI 음성 재생 오류:',
        event
      )
    }

    // =====================================================
    // 음성 재생
    // =====================================================

    window.speechSynthesis.speak(
      utterance
    )
  }


  // =========================================================
  // ★ 음성 질문 시작
  // =========================================================

  const startListening = () => {
    // =====================================================
    // SpeechRecognition 지원 여부
    // =====================================================

    if (!recognitionRef.current) {
      alert(
        '이 브라우저에서는 음성 인식을 사용할 수 없습니다.'
      )

      return
    }

    // =====================================================
    // 이미 듣고 있다면 중지
    // =====================================================

    if (isListening) {
      console.log(
        '🎤 음성 인식 수동 종료'
      )

      recognitionRef.current.stop()

      return
    }

    // =====================================================
    // AI 음성이 재생 중이라면 중지
    // =====================================================

    window.speechSynthesis.cancel()

    // =====================================================
    // 이전 문장 초기화
    // =====================================================

    finalTranscriptRef.current = ''
    autoSendRef.current = false

    setInput('')

    // =====================================================
    // 음성 인식 시작
    // =====================================================

    try {
      recognitionRef.current.start()

      console.log(
        '🎤 마이크 듣기 시작'
      )
    } catch (error) {
      console.error(
        '🎤 음성 인식 시작 실패:',
        error
      )
    }
  }


  // =========================================================
  // ★ AI 서버에 메시지 전송
  // =========================================================

  const sendMessage = async (text) => {
    const cleanText =
      text.trim()

    // =====================================================
    // 빈 질문 방지
    // =====================================================

    if (!cleanText) {
      return
    }

    // =====================================================
    // 이미 요청 중이면 중복 요청 방지
    // =====================================================

    if (isSendingRef.current) {
      console.log(
        '이미 AI 요청 처리 중입니다.'
      )

      return
    }

    isSendingRef.current = true

    // =====================================================
    // 사용자 메시지 화면에 추가
    // =====================================================

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: cleanText,
      },
    ])

    // =====================================================
    // 입력창 비우기
    // =====================================================

    setInput('')

    // =====================================================
    // AI가 생각하는 동안 표정
    // =====================================================

    changeExpression('F05')

    try {
      // ===================================================
      // API 주소
      // ===================================================

      const API_URL =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/chat'
          : '/api/chat'

      console.log(
        '🤖 AI 서버 요청:',
        cleanText
      )

      // ===================================================
      // 서버 요청
      // ===================================================

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

      // ===================================================
      // 서버 오류
      // ===================================================

      if (!response.ok) {
        throw new Error(
          `서버 응답 오류: ${response.status}`
        )
      }

      // ===================================================
      // JSON
      // ===================================================

      const data =
        await response.json()

      console.log(
        '🤖 서버 응답:',
        data
      )

      console.log(
        '🤖 AI 답변:',
        data.reply
      )

      console.log(
        '🤖 AI 감정:',
        data.emotion
      )

      // ===================================================
      // AI 답변 화면 표시
      // ===================================================

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content:
            data.reply ||
            '답변을 받지 못했습니다.',
        },
      ])

      // ===================================================
      // 감정 → Live2D
      // ===================================================

      changeEmotion(
        data.emotion
      )

      // ===================================================
      // AI 음성 출력
      // ===================================================

      if (data.reply) {
        speakAI(data.reply)
      }

    } catch (error) {
      console.error(
        '❌ 채팅 요청 실패:',
        error
      )

      // ===================================================
      // 오류 메시지
      // ===================================================

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content:
            '서버와 연결할 수 없습니다.',
        },
      ])

      // ===================================================
      // 오류 → 슬픈 표정
      // ===================================================

      changeExpression('F03')

    } finally {
      // ===================================================
      // 요청 종료
      // ===================================================

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

    // =====================================================
    // 음성 인식 중이면 중지
    // =====================================================

    if (
      recognitionRef.current &&
      isListening
    ) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log(error)
      }
    }

    // =====================================================
    // AI 전송
    // =====================================================

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

        {/* ===================================================
            헤더
        =================================================== */}

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

          {/* =================================================
              입력창
          ================================================= */}

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
                ? '🎤 듣고 있습니다...'
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
              전송 버튼
          ================================================= */}

          <button
            type="submit"
          >
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