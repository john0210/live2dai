
import { useEffect, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  // Live2D 초기화
  useEffect(() => {
    const delegate = LAppDelegate.getInstance()

    if (!delegate.initialize()) {
      console.error('Live2D 초기화 실패')
      return
    }

    delegate.run()
  }, [])

  // Live2D 표정 변경
  const changeExpression = (expressionId) => {
    const delegate = LAppDelegate.getInstance()

    delegate.setExpression(expressionId)
  }

  // 채팅 메시지 전송
  const handleSubmit = (e) => {
    e.preventDefault()

    const text = input.trim()

    if (!text) {
      return
    }

    // 사용자 메시지 추가
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: text,
      },
    ])

    // 입력창 비우기
    setInput('')

    // 임시 AI 응답
    setTimeout(() => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'ai',
          content: '안녕하세요. 저는 Live2D AI 캐릭터입니다.',
        },
      ])

      // AI 응답에 따른 표정 변경
      changeExpression('F01')
    }, 500)
  }

  return (
    <div className="app">

      {/* =========================
          채팅 UI
      ========================= */}
      <div className="chat-container">

        <div className="chat-header">
          Live 2D AI
        </div>

        {/* 메시지 영역 */}
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

        {/* 입력 영역 */}
        <form
          className="chat-input-area"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요..."
          />

          <button type="submit">
            전송
          </button>

        </form>

      </div>


      {/* =========================
          표정 버튼
      ========================= */}
      <div className="expression-buttons">

        <button onClick={() => changeExpression('F01')}>
          표정 1
        </button>

        <button onClick={() => changeExpression('F02')}>
          표정 2
        </button>

        <button onClick={() => changeExpression('F03')}>
          표정 3
        </button>

        <button onClick={() => changeExpression('F04')}>
          표정 4
        </button>

        <button onClick={() => changeExpression('F05')}>
          표정 5
        </button>

        <button onClick={() => changeExpression('F06')}>
          표정 6
        </button>

        <button onClick={() => changeExpression('F07')}>
          표정 7
        </button>

        <button onClick={() => changeExpression('F08')}>
          표정 8
        </button>

      </div>

    </div>
  )
}

export default App

