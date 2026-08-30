import { useEffect, useRef, useState } from 'react'
import { LAppDelegate } from './live2d/lappdelegate'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef(null)

  const finalTranscriptRef = useRef('')

  const isSendingRef = useRef(false)

  // 뉴스 실행 중복 방지
  const dailyNewsStartedRef = useRef(false)


  // =========================================================
  // AI 첫 인사
  // =========================================================

  const greeting =
    '안녕! 당신의 믿음직한 비서 AI 앨런이에요. 잠시만 기다려 주시면 오늘 뉴스를 전해드릴게요.'


  // =========================================================
  // 뉴스가 끝난 뒤 대화를 시작하는 문장
  // =========================================================

  const conversationStartMessage =
    '자, 그럼 지금부터 무슨 대화를 나누어 볼까요, 정현님?'


  // =========================================================
  // AI 음성 출력
  // =========================================================

  const speakAI = (text, onEnd = null) => {

    if (!window.speechSynthesis) {

      console.error(
        '이 브라우저는 음성 합성을 지원하지 않습니다.'
      )

      if (onEnd) {
        onEnd()
      }

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

      if (onEnd) {
        onEnd()
      }
    }


    utterance.onerror = (event) => {

      console.error(
        '🔊 음성 재생 오류:',
        event
      )

      if (onEnd) {
        onEnd()
      }
    }


    window.speechSynthesis.speak(
      utterance
    )
  }


  // =========================================================
  // Live2D 초기화
  // =========================================================

  useEffect(() => {

    const delegate =
      LAppDelegate.getInstance()


    if (!delegate.initialize()) {

      console.error(
        'Live2D 초기화 실패'
      )

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

      const recognition =
        new SpeechRecognition()


      recognition.lang =
        'ko-KR'


      recognition.interimResults =
        true


      recognition.continuous =
        false


      recognition.onstart = () => {

        console.log(
          '🎤 음성 인식 시작'
        )

        setIsListening(true)

        finalTranscriptRef.current =
          ''
      }


      recognition.onresult =
        (event) => {

          let finalText = ''

          let interimText = ''


          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {

            const transcript =
              event.results[i][0]
                .transcript


            if (
              event.results[i].isFinal
            ) {

              finalText +=
                transcript

            } else {

              interimText +=
                transcript
            }
          }


          if (finalText) {

            finalTranscriptRef.current +=
              finalText
          }


          setInput(
            finalTranscriptRef.current +
              interimText
          )
        }


      recognition.onend = () => {

        console.log(
          '🎤 음성 인식 종료'
        )

        setIsListening(false)


        const text =
          finalTranscriptRef.current.trim()


        console.log(
          '🎤 최종 인식 문장:',
          text
        )


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


        if (
          event.error === 'not-allowed'
        ) {

          alert(
            '마이크 사용 권한을 허용해주세요.'
          )
        }
      }


      recognitionRef.current =
        recognition
    }


    // =======================================================
    // 첫 인사
    // =======================================================

    setMessages([
      {
        role: 'ai',
        content: greeting,
      },
    ])


    // =======================================================
    // 인사 후 오늘의 뉴스 시작
    // =======================================================

    const startDailyNews = () => {

      if (
        dailyNewsStartedRef.current
      ) {
        return
      }


      dailyNewsStartedRef.current =
        true


      console.log(
        '📰 앨런의 인사가 끝났습니다.'
      )


      // =====================================================
      // 인사가 끝난 후 2.5초 동안 뜸을 들임
      // =====================================================

      setTimeout(() => {

        getTodayNews()

      }, 2500)
    }


    // =======================================================
    // 음성 엔진 준비
    // =======================================================

    const speakGreeting = () => {

      // =====================================================
      // ★ 첫 인사를 1초 늦게 시작
      // =====================================================

      setTimeout(() => {

        speakAI(
          greeting,
          startDailyNews
        )

      }, 1000)
    }


    const voices =
      window.speechSynthesis.getVoices()


    if (
      voices.length > 0
    ) {

      speakGreeting()

    } else {

      window.speechSynthesis.onvoiceschanged =
        speakGreeting
    }


    // =======================================================
    // Cleanup
    // =======================================================

    return () => {

      window.speechSynthesis.cancel()


      window.speechSynthesis.onvoiceschanged =
        null


      if (
        recognitionRef.current
      ) {

        recognitionRef.current.stop()
      }


      LAppDelegate.releaseInstance()
    }

  }, [])


  // =========================================================
  // 오늘의 뉴스 가져오기
  // =========================================================

  const getTodayNews = async () => {

    try {

      console.log(
        '📰 오늘의 주요 뉴스 검색 시작'
      )


      const newsAPI =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/news?q=오늘 주요 뉴스'
          : '/api/news?q=오늘 주요 뉴스'


      const newsResponse =
        await fetch(newsAPI)


      if (!newsResponse.ok) {

        throw new Error(
          '뉴스 검색 서버 오류'
        )
      }


      const newsData =
        await newsResponse.json()


      console.log(
        '📰 뉴스 검색 결과:',
        newsData
      )


      if (
        !newsData.news ||
        newsData.news.length === 0
      ) {

        throw new Error(
          '뉴스가 없습니다.'
        )
      }


      // =====================================================
      // 검색된 뉴스들을 Gemini에게 전달
      // =====================================================

      const summaryAPI =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/news-summary'
          : '/api/news-summary'


      const summaryResponse =
        await fetch(
          summaryAPI,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              news:
                newsData.news,
            }),
          }
        )


      if (!summaryResponse.ok) {

        throw new Error(
          '뉴스 분석 서버 오류'
        )
      }


      const summaryData =
        await summaryResponse.json()


      console.log(
        '📰 Gemini 뉴스 분석:',
        summaryData
      )


      // =====================================================
      // AI가 사용자에게 말할 뉴스
      // =====================================================

      const newsReply =
        summaryData.reply


      // =====================================================
      // 채팅창에 뉴스 표시
      // =====================================================

      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              newsReply,
          },
        ]
      )


      // =====================================================
      // Gemini 감정 → Live2D
      // =====================================================

      changeEmotion(
        summaryData.emotion
      )


      // =====================================================
      // ★ 뉴스 음성이 끝난 다음 대화 시작
      // =====================================================

      speakAI(
        newsReply,
        () => {

          console.log(
            '📰 뉴스 음성이 끝났습니다.'
          )


          // =================================================
          // 채팅창에 대화 시작 문장 추가
          // =================================================

          setMessages(
            (prevMessages) => [
              ...prevMessages,
              {
                role: 'ai',
                content:
                  conversationStartMessage,
              },
            ]
          )


          // =================================================
          // Live2D 표정은 자연스럽게 중립 표정
          // =================================================

          changeExpression(
            'F01'
          )


          // =================================================
          // 앨런이 대화 시작 문장을 음성으로 말함
          // =================================================

          speakAI(
            conversationStartMessage
          )
        }
      )

    } catch (error) {

      console.error(
        '📰 오늘의 뉴스 가져오기 실패:',
        error
      )


      const errorMessage =
        '오늘의 주요 뉴스를 가져오는 데 문제가 생겼어요.'


      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              errorMessage,
          },
        ]
      )


      changeExpression(
        'F03'
      )


      speakAI(
        errorMessage
      )
    }
  }


  // =========================================================
  // Live2D 표정 변경
  // =========================================================

  const changeExpression = (
    expressionId
  ) => {

    const delegate =
      LAppDelegate.getInstance()


    delegate.setExpression(
      expressionId
    )
  }


  // =========================================================
  // Gemini 감정 → Live2D 표정
  // =========================================================

  const changeEmotion = (
    emotion
  ) => {

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
      expressionMap[emotion] ||
      'F01'


    changeExpression(
      expressionId
    )
  }


  // =========================================================
  // 뉴스 질문인지 판단
  // =========================================================

  const isNewsRequest = (
    text
  ) => {

    const newsKeywords = [

      '뉴스',

      '최신 뉴스',

      '오늘 뉴스',

      '최근 뉴스',

      '뉴스 알려',

      '뉴스 찾아',

      '뉴스 검색',

      '소식',

    ]


    return newsKeywords.some(
      (keyword) =>
        text.includes(keyword)
    )
  }


  // =========================================================
  // 뉴스 검색어 추출
  // =========================================================

  const getNewsQuery = (
    text
  ) => {

    let query = text


    const removeWords = [

      '뉴스',

      '최신',

      '오늘',

      '최근',

      '알려줘',

      '알려',

      '찾아줘',

      '찾아',

      '검색해줘',

      '검색해',

      '검색',

      '알려주세요',

      '소식',

      '좀',

      '해줘',

    ]


    removeWords.forEach(
      (word) => {

        query =
          query.replaceAll(
            word,
            ' '
          )
      }
    )


    query =
      query
        .replace(
          /\s+/g,
          ' '
        )
        .trim()


    if (!query) {

      query =
        '주요 뉴스'
    }


    return query
  }


  // =========================================================
  // 뉴스 검색
  // =========================================================

  const searchNews = async (
    text
  ) => {

    const query =
      getNewsQuery(text)


    console.log(
      '📰 뉴스 검색어:',
      query
    )


    const API_URL =
      import.meta.env.DEV
        ? `http://localhost:3000/api/news?q=${encodeURIComponent(query)}`
        : `/api/news?q=${encodeURIComponent(query)}`


    const response =
      await fetch(API_URL)


    if (!response.ok) {

      throw new Error(
        '뉴스 서버 응답 오류'
      )
    }


    const data =
      await response.json()


    console.log(
      '📰 뉴스 검색 결과:',
      data
    )


    return data
  }


  // =========================================================
  // 사용자 뉴스 질문 결과
  // =========================================================

  const showNewsResults = async (
    data
  ) => {

    if (
      !data.news ||
      data.news.length === 0
    ) {

      const noNewsMessage =
        '죄송해요. 해당 검색어와 관련된 뉴스를 찾지 못했어요.'


      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              noNewsMessage,
          },
        ]
      )


      changeExpression(
        'F03'
      )


      speakAI(
        noNewsMessage
      )


      return
    }


    try {

      const summaryAPI =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/news-summary'
          : '/api/news-summary'


      const response =
        await fetch(
          summaryAPI,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              news:
                data.news,
            }),
          }
        )


      if (!response.ok) {

        throw new Error(
          '뉴스 분석 오류'
        )
      }


      const summaryData =
        await response.json()


      // =====================================================
      // AI가 실제로 말할 뉴스 내용
      // =====================================================

      const newsReply =
        summaryData.reply


      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              newsReply,
          },
        ]
      )


      changeEmotion(
        summaryData.emotion
      )


      speakAI(
        newsReply
      )

    } catch (error) {

      console.error(
        '뉴스 요약 오류:',
        error
      )


      const errorMessage =
        '뉴스를 분석하는 중 문제가 발생했어요.'


      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              errorMessage,
          },
        ]
      )


      changeExpression(
        'F03'
      )


      speakAI(
        errorMessage
      )
    }
  }


  // =========================================================
  // 음성 질문 시작
  // =========================================================

  const startListening = () => {

    if (
      !recognitionRef.current
    ) {

      alert(
        '이 브라우저에서는 음성 인식을 사용할 수 없습니다.'
      )

      return
    }


    if (isListening) {

      recognitionRef.current.stop()

      return
    }


    // AI가 말하고 있다면 중지
    window.speechSynthesis.cancel()


    finalTranscriptRef.current =
      ''


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

  const sendMessage = async (
    text
  ) => {

    const cleanText =
      text.trim()


    if (!cleanText) {
      return
    }


    if (isSendingRef.current) {
      return
    }


    isSendingRef.current =
      true


    // =====================================================
    // 사용자 메시지 추가
    // =====================================================

    setMessages(
      (prevMessages) => [
        ...prevMessages,
        {
          role: 'user',
          content:
            cleanText,
        },
      ]
    )


    setInput('')


    try {

      // =====================================================
      // 뉴스 질문
      // =====================================================

      if (
        isNewsRequest(
          cleanText
        )
      ) {

        const newsData =
          await searchNews(
            cleanText
          )


        await showNewsResults(
          newsData
        )


        return
      }


      // =====================================================
      // 기존 Gemini 채팅
      // =====================================================

      const API_URL =
        import.meta.env.DEV
          ? 'http://localhost:3000/api/chat'
          : '/api/chat'


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
              message:
                cleanText,
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

      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              data.reply,
          },
        ]
      )


      // =====================================================
      // 감정 → Live2D
      // =====================================================

      changeEmotion(
        data.emotion
      )


      // =====================================================
      // AI 음성 출력
      // =====================================================

      speakAI(
        data.reply
      )

    } catch (error) {

      console.error(
        '채팅 요청 실패:',
        error
      )


      const errorMessage =
        '서버와 연결할 수 없습니다.'


      setMessages(
        (prevMessages) => [
          ...prevMessages,
          {
            role: 'ai',
            content:
              errorMessage,
          },
        ]
      )


      changeExpression(
        'F03'
      )

    } finally {

      isSendingRef.current =
        false
    }
  }


  // =========================================================
  // 텍스트 채팅 전송
  // =========================================================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault()


    const text =
      input.trim()


    if (!text) {
      return
    }


    if (
      recognitionRef.current &&
      isListening
    ) {

      recognitionRef.current.stop()
    }


    await sendMessage(
      text
    )
  }


  // =========================================================
  // 화면
  // =========================================================

  return (
    <div className="app">

      <div className="chat-container">

        <div className="chat-header">
          Live 2D AI
        </div>


        <div className="messages">

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


        <form
          className="chat-input-area"
          onSubmit={
            handleSubmit
          }
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


          <button type="submit">
            전송
          </button>

        </form>

      </div>


      {/* ===================================================
          표정 테스트 버튼
      =================================================== */}

      <div className="expression-buttons">

        <button
          onClick={() =>
            changeExpression(
              'F01'
            )
          }
        >
          표정 1
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F02'
            )
          }
        >
          표정 2
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F03'
            )
          }
        >
          표정 3
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F04'
            )
          }
        >
          표정 4
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F05'
            )
          }
        >
          표정 5
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F06'
            )
          }
        >
          표정 6
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F07'
            )
          }
        >
          표정 7
        </button>


        <button
          onClick={() =>
            changeExpression(
              'F08'
            )
          }
        >
          표정 8
        </button>

      </div>

    </div>
  )
}

export default App