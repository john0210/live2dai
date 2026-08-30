
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})

export default async function handler(req, res) {

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // OPTIONS 요청
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    // POST만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({
            reply: 'POST 요청만 사용할 수 있습니다.',
            emotion: 'neutral',
        })
    }

    const { message } = req.body || {}

    console.log('사용자 질문:', message)

    // 질문이 없는 경우
    if (!message || !message.trim()) {
        return res.status(400).json({
            reply: '질문을 입력해주세요.',
            emotion: 'neutral',
        })
    }

    try {

        const response = await ai.models.generateContent({

            model: 'gemini-3.5-flash-lite',

            contents: `
너는 Live2D 캐릭터 AI다.

사용자의 질문에 자연스럽고 친절하게 답변하라.

그리고 네가 작성한 답변의 감정에 가장 적절한 emotion을 하나 선택하라.

사용 가능한 emotion은 반드시 다음 6개 중 하나만 사용한다.

happy
surprised
sad
angry
thinking
neutral

각 emotion의 의미는 다음과 같다.

happy:
기쁘거나 친근하거나 긍정적인 상황

surprised:
놀랍거나 예상하지 못한 상황

sad:
슬프거나 안타깝거나 부정적인 상황

angry:
화가 나거나 강하게 비판하는 상황

thinking:
철학적이거나 복잡하거나 깊이 생각해야 하는 상황

neutral:
특별한 감정이 필요하지 않은 일반적인 설명

반드시 다음 JSON 형식으로만 응답하라.

{
    "reply": "사용자에게 보여줄 답변",
    "emotion": "happy"
}

중요:
- JSON 이외의 설명을 출력하지 마라.
- markdown을 사용하지 마라.
- reply에는 실제 사용자에게 보여줄 답변을 넣어라.
- emotion에는 위에서 허용한 값 중 하나만 넣어라.

사용자 질문:
${message}
            `,

            config: {
                responseMimeType: 'application/json',
            },
        })

        console.log('Gemini 원본 응답:')
        console.log(response.text)

        const result = JSON.parse(response.text)

        console.log('AI 답변:', result.reply)
        console.log('AI 감정:', result.emotion)

        const allowedEmotions = [
            'happy',
            'surprised',
            'sad',
            'angry',
            'thinking',
            'neutral',
        ]

        const emotion = allowedEmotions.includes(result.emotion)
            ? result.emotion
            : 'neutral'

        return res.status(200).json({
            reply: result.reply,
            emotion: emotion,
        })

    } catch (error) {

        console.error('Gemini API 오류:', error)

        return res.status(500).json({
            reply: 'AI 응답을 가져오는 중 오류가 발생했습니다.',
            emotion: 'sad',
        })
    }
}

