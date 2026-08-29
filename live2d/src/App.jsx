import { useEffect } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  useEffect(() => {
    const delegate = LAppDelegate.getInstance()

    if (!delegate.initialize()) {
      console.error('Live2D 초기화 실패')
      return
    }

    delegate.run()
  }, [])

  const changeExpression = (expressionId) => {
    const delegate = LAppDelegate.getInstance()

    delegate.setExpression(expressionId)
  }

  return (
    <div className="app">
      <div className="ui">
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
    </div>
  )
}

export default App


