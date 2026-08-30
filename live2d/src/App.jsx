
import { useEffect, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

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

    return () => {
      window.speechSynthesis.cancel()
      LAppDelegate.releaseInstance()
    }
  }, [])


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

  // 이전 음성 중지
  window.speechSynthesis.cancel()

  const utterance =
    new SpeechSynthesisUtterance(text)

  // 한국어
  utterance.lang = 'ko-KR'

  // =========================
  // 목소리 설정
  // =========================

  // 조금 빠르고 밝게
  utterance.rate = 1.05

  // 음정을 조금 높게
  // 젊고 밝은 느낌을 위한 설정
  utterance.pitch = 1.25

  // 볼륨
  utterance.volume = 1.0


  // =========================
  // 한국어 음성 찾기
  // =========================

  const voices =
    window.speechSynthesis.getVoices()

  console.log(
    '사용 가능한 음성:',
    voices
  )


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
  // 여성 음성을 우선적으로 찾기
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
  // 여성 음성이 있으면 사용
  // =========================

  if (femaleVoice) {

    console.log(
      '선택된 여성 음성:',
      femaleVoice.name
    )

    utterance.voice = femaleVoice

  } else if (koreanVoices.length > 0) {

    // 여성 음성을 찾지 못하면
    // 첫 번째 한국어 음성 사용

    console.log(
      '여성 음성을 찾지 못했습니다.'
    )

    console.log(
      '기본 한국어 음성 사용:',
      koreanVoices[0].name
    )

    utterance.voice =
      koreanVoices[0]
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
    // Express 서버 요청
    // =========================

    try {
      const response = await fetch(
        'http://localhost:3000/api/chat',
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
        throw new Error('서버 응답 오류')
      }


      // =========================
      // 서버 응답 JSON
      // =========================

      const data = await response.json()

      console.log('서버 응답:', data)

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
      // Gemini 감정 → Live2D 표정
      // =========================

      changeEmotion(data.emotion)


      // =========================
      // AI 답변 음성 출력
      // =========================

      speakAI(data.reply)


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


      // 오류 발생 시 슬픈 표정
      changeExpression('F03')
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


          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              {message.content}
            </div>
          ))}

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

