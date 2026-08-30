
import { useEffect, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [speechReady, setSpeechReady] = useState(false)

  // =========================
  // Live2D 초기화
  // =========================

  useEffect(() => {
    const delegate = LAppDelegate.getInstance()

    if (!delegate.initialize()) {
      console.error('Live2D 초기화 실패')
      return
    }

    delegate.run()

    // =========================
    // 음성 목록 로딩
    // =========================

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()

      console.log('사용 가능한 음성:', voices)

      if (voices.length > 0) {
        setSpeechReady(true)
      }
    }

    loadVoices()

    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel()
      window.speechSynthesis.onvoiceschanged = null

      LAppDelegate.releaseInstance()
    }
  }, [])


  // =========================
  // 모바일 음성 활성화
  // =========================

  const activateSpeech = () => {
    if (!window.speechSynthesis) {
      console.error(
        '이 브라우저는 음성 합성을 지원하지 않습니다.'
      )
      return
    }

    console.log('음성 엔진 활성화')

    // 현재 음성을 중지
    window.speechSynthesis.cancel()

    // 아주 짧은 빈 음성을 실행
    // 모바일 브라우저의 음성 엔진을 활성화하기 위한 용도
    const utterance =
      new SpeechSynthesisUtterance('')

    utterance.volume = 0

    window.speechSynthesis.speak(utterance)

    setSpeechReady(true)
  }


  // =========================
  // Live2D 표정 변경
  // =========================

  const changeExpression = (expressionId) => {
    const delegate = LAppDelegate.getInstance()

    delegate.setExpression(expressionId)
  }


  // =========================
  // Gemini 감정 → Live2D 표정
  // =========================

  const changeEmotion = (emotion) => {
    console.log('Gemini 감정:', emotion)

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
      'Live2D 표정 변경:',
      emotion,
      '→',
      expressionId
    )

    changeExpression(expressionId)
  }


  // =========================
  // AI 음성 출력
  // =========================

  const speakAI = (text) => {
    if (!window.speechSynthesis) {
      console.error(
        '이 브라우저는 음성 합성을 지원하지 않습니다.'
      )
      return
    }

    console.log('AI 음성 출력 시작')

    // 이전 음성 중지
    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(text)

    // =========================
    // 한국어
    // =========================

    utterance.lang = 'ko-KR'

    // =========================
    // 목소리 설정
    // =========================

    utterance.rate = 1.05
    utterance.pitch = 1.25
    utterance.volume = 1.0


    // =========================
    // 음성 목록
    // =========================

    const voices =
      window.speechSynthesis.getVoices()

    console.log(
      '현재 사용 가능한 음성:',
      voices
    )


    // =========================
    // 한국어 음성 찾기
    // =========================

    const koreanVoices =
      voices.filter((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith('ko')
      )

    console.log(
      '한국어 음성:',
      koreanVoices
    )


    // =========================
    // 여성 음성 우선 선택
    // =========================

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


    // =========================
    // 음성 선택
    // =========================

    if (femaleVoice) {

      console.log(
        '선택된 여성 음성:',
        femaleVoice.name
      )

      utterance.voice =
        femaleVoice

    } else if (koreanVoices.length > 0) {

      console.log(
        '한국어 기본 음성 사용:',
        koreanVoices[0].name
      )

      utterance.voice =
        koreanVoices[0]

    } else {

      console.log(
        '한국어 음성을 찾지 못했습니다.'
      )
    }


    // =========================
    // 음성 이벤트
    // =========================

    utterance.onstart = () => {
      console.log('🔊 AI 음성 재생 시작')
    }

    utterance.onend = () => {
      console.log('🔊 AI 음성 재생 종료')
    }

    utterance.onerror = (event) => {
      console.error(
        '🔊 음성 재생 오류:',
        event
      )
    }


    // =========================
    // 음성 재생
    // =========================

    window.speechSynthesis.speak(
      utterance
    )
  }


  // =========================
  // 채팅 메시지 전송
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault()

    const text = input.trim()

    if (!text) {
      return
    }


    // =========================
    // ★ 중요
    // 사용자가 전송 버튼을 누른
    // 순간 음성 엔진 활성화
    // =========================

    activateSpeech()


    // =========================
    // 사용자 메시지 추가
    // =========================

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: text,
      },
    ])


    // 입력창 비우기
    setInput('')


    // =========================
    // AI 서버 요청
    // =========================

    try {

      const API_URL = import.meta.env.DEV
        ? 'http://localhost:3000/api/chat'
        : '/api/chat'


      const response = await fetch(
        API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            message: text,
          }),
        }
      )


      // =========================
      // 서버 오류 확인
      // =========================

      if (!response.ok) {
        throw new Error(
          '서버 응답 오류'
        )
      }


      // =========================
      // 서버 응답 JSON
      // =========================

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


      // =========================
      // AI 답변 화면에 추가
      // =========================

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content: data.reply,
        },
      ])


      // =========================
      // Gemini 감정
      // → Live2D 표정
      // =========================

      changeEmotion(
        data.emotion
      )


      // =========================
      // AI 답변 음성 출력
      // =========================

      speakAI(
        data.reply
      )


    } catch (error) {

      console.error(
        '채팅 요청 실패:',
        error
      )


      // =========================
      // 오류 메시지
      // =========================

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content:
            '서버와 연결할 수 없습니다.',
        },
      ])


      // 오류 발생 시
      // 슬픈 표정

      changeExpression(
        'F03'
      )
    }
  }


  // =========================
  // 화면
  // =========================

  return (
    <div className="app">

      {/* =========================
          채팅 UI
      ========================= */}

      <div className="chat-container">

        <div className="chat-header">
          Live 2D AI
        </div>


        {/* =========================
            메시지 영역
        ========================= */}

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


        {/* =========================
            입력 영역
        ========================= */}

        <form
          className="chat-input-area"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            placeholder="질문을 입력하세요..."
          />


          <button type="submit">
            전송
          </button>

        </form>

      </div>


      {/* =========================
          수동 표정 테스트 버튼
      ========================= */}

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

