const express = require('express')
const cors = require('cors')
const { GoogleGenAI } = require('@google/genai')
const Parser = require('rss-parser')
require('dotenv').config()

const app = express()


// =========================
// 기본 설정
// =========================

app.use(cors())
app.use(express.json())


// =========================
// 뉴스 RSS 설정
// =========================

const parser = new Parser()


// =========================
// Gemini API 설정
// =========================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})


// =========================================================
// AI 채팅 API
// =========================================================

app.post('/api/chat', async (req, res) => {

    const { message } = req.body

    console.log(
        '사용자 질문:',
        message
    )


    if (!message || !message.trim()) {

        return res.status(400).json({

            reply:
                '질문을 입력해주세요.',

            emotion:
                'neutral',

        })
    }


    try {

        const response =
            await ai.models.generateContent({

                model:
                    'gemini-3.5-flash-lite',

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


각 emotion의 의미:

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

                    responseMimeType:
                        'application/json',

                },

            })


        console.log(
            'Gemini 원본 응답:'
        )

        console.log(
            response.text
        )


        const result =
            JSON.parse(
                response.text
            )


        const allowedEmotions = [

            'happy',
            'surprised',
            'sad',
            'angry',
            'thinking',
            'neutral',

        ]


        const emotion =
            allowedEmotions.includes(
                result.emotion
            )
                ? result.emotion
                : 'neutral'


        res.json({

            reply:
                result.reply,

            emotion:
                emotion,

        })


    } catch (error) {

        console.error(
            'Gemini API 오류:',
            error
        )


        res.status(500).json({

            reply:
                'AI 응답을 가져오는 중 오류가 발생했습니다.',

            emotion:
                'sad',

        })
    }
})


// =========================================================
// 뉴스 RSS 가져오기 함수
// =========================================================

const fetchNewsByQuery = async (query) => {

    try {

        const encodedQuery =
            encodeURIComponent(
                query
            )


        const newsUrl =
            `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`


        const feed =
            await parser.parseURL(
                newsUrl
            )


        return feed.items
            .map((item) => ({

                title:
                    item.title || '',

                link:
                    item.link || '',

                pubDate:
                    item.pubDate || '',

                description:
                    item.contentSnippet ||
                    item.content ||
                    '',

            }))


    } catch (error) {

        console.error(
            `뉴스 검색 실패 (${query}):`,
            error
        )

        return []
    }
}


// =========================================================
// 뉴스 중복 제거
// =========================================================

const removeDuplicateNews = (
    news
) => {

    const seen =
        new Set()


    return news.filter(
        (item) => {

            const key =
                item.title
                    .trim()
                    .toLowerCase()


            if (!key) {
                return false
            }


            if (seen.has(key)) {
                return false
            }


            seen.add(key)

            return true
        }
    )
}


// =========================================================
// 뉴스 검색 API
// =========================================================

app.get('/api/news', async (req, res) => {

    const query =
        req.query.q


    console.log(
        '📰 뉴스 검색 요청:',
        query
    )


    try {

        let queries = []


        // =====================================================
        // 일반적인 오늘의 주요 뉴스
        // =====================================================

        if (
            !query ||
            query.trim() === '' ||
            query.includes('주요 뉴스')
        ) {

            queries = [

                '오늘 한국 주요 뉴스 when:1d',

                '오늘 정치 정부 뉴스 when:1d',

                '오늘 경제 뉴스 when:1d',

                '오늘 사회 뉴스 when:1d',

                '오늘 과학 기술 뉴스 when:1d',

                '오늘 국제 뉴스 when:1d',

            ]

        } else {

            // =================================================
            // 사용자가 직접 검색한 뉴스
            // =================================================

            queries = [

                `${query.trim()} when:7d`,

            ]
        }


        console.log(
            '📰 실제 검색 쿼리:',
            queries
        )


        // =====================================================
        // 여러 검색어를 동시에 검색
        // =====================================================

        const results =
            await Promise.all(
                queries.map(
                    (searchQuery) =>
                        fetchNewsByQuery(
                            searchQuery
                        )
                )
            )


        // =====================================================
        // 모든 뉴스 합치기
        // =====================================================

        let allNews = []

        results.forEach(
            (result) => {

                allNews =
                    allNews.concat(
                        result
                    )

            }
        )


        // =====================================================
        // 중복 제거
        // =====================================================

        allNews =
            removeDuplicateNews(
                allNews
            )


        // =====================================================
        // 기사 내용이 너무 빈약한 항목 제거
        // =====================================================

        allNews =
            allNews.filter(
                (item) => {

                    const title =
                        item.title.trim()

                    const description =
                        item.description.trim()


                    if (
                        title.length < 10
                    ) {
                        return false
                    }


                    if (
                        description.length < 20
                    ) {
                        return false
                    }


                    return true
                }
            )


        // =====================================================
        // 최대 30개
        // =====================================================

        allNews =
            allNews.slice(
                0,
                30
            )


        console.log(
            '📰 최종 뉴스:',
            allNews.length,
            '개'
        )


        res.json({

            query:
                query || '오늘 주요 뉴스',

            news:
                allNews,

        })


    } catch (error) {

        console.error(
            '📰 뉴스 검색 오류:',
            error
        )


        res.status(500).json({

            error:
                '뉴스를 가져오는 중 오류가 발생했습니다.',

        })
    }
})


// =========================================================
// 뉴스 요약 API
// =========================================================

app.post(
    '/api/news-summary',
    async (req, res) => {

        const { news } =
            req.body


        console.log(
            '📰 Gemini 뉴스 분석 시작'
        )


        if (
            !news ||
            !Array.isArray(news) ||
            news.length === 0
        ) {

            return res.status(400).json({

                error:
                    '분석할 뉴스가 없습니다.',

            })
        }


        try {

            // =================================================
            // Gemini에게 전달할 뉴스
            // =================================================

            const newsText =
                news
                    .map(
                        (item, index) => `

[뉴스 ${index + 1}]

제목:
${item.title}

기사 내용:
${item.description}

발행일:
${item.pubDate}

링크:
${item.link}

`
                    )
                    .join('\n')


            // =================================================
            // Gemini 뉴스 분석
            // =================================================

            const response =
                await ai.models.generateContent({

                    model:
                        'gemini-3.5-flash-lite',

                    contents: `

너는 사용자의 곁에서 뉴스를 직접 알려주는
Live2D AI 비서 "앨런"이다.


==================================================
목표
==================================================

아래에 제공된 실제 뉴스 기사 목록을 읽고
오늘 가장 중요하다고 판단되는
뉴스 기사 하나를 선택하라.

그리고 그 뉴스에서 실제로 무슨 일이 있었는지를
사용자에게 직접 이야기하듯 자연스럽게 알려줘라.


==================================================
가장 중요한 규칙
==================================================

뉴스 제목을 단순히 읽지 마라.

뉴스 제목만 보고 내용을 상상하지 마라.

반드시 "무슨 일이 있었는지"를 설명하라.


예:

나쁜 답변:

"오늘의 주요 뉴스예요.
정부의 새로운 정책 발표 소식입니다."


좋은 답변:

"오늘의 주요 뉴스예요.
정부가 오늘 ○○와 관련한 새로운 정책을 발표했어요.
이번 발표에서는 ○○에 대한 내용이 포함됐는데요.
이 정책이 시행되면 ○○에 영향을 줄 수 있다는 점에서
관심을 받을 만한 소식입니다."


==================================================
말투
==================================================

신문 기사처럼 딱딱하게 작성하지 마라.

아나운서처럼 제목만 나열하지 마라.

사용자의 옆에서 직접 이야기하는
친절한 비서처럼 말하라.


자연스러운 표현:

"오늘은 ○○와 관련해서 중요한 일이 있었어요."

"오늘 ○○에서 새로운 발표가 나왔어요."

"○○와 관련해서 새로운 소식이 들어왔어요."

"오늘 ○○에서 이런 일이 있었는데요."

"이번 소식이 중요한 이유는 ○○ 때문이에요."


==================================================
절대로 사용하지 말아야 하는 표현
==================================================

"확인해 보세요."

"확인해 보시면 도움이 됩니다."

"참고하시기 바랍니다."

"일정을 확인해 보세요."

"하루를 계획해 보세요."

"미리 챙겨보세요."

"좋은 아침이에요."

"좋은 저녁이에요."

"오늘 하루를 시작해 보세요."


사용자에게 뉴스를 확인하라고 지시하지 마라.

앨런이 직접 뉴스를 전달해야 한다.


==================================================
뉴스 선택
==================================================

가장 중요한 실제 사건 하나를 선택하라.

다음 항목은 선택하지 마라.

- 방송 프로그램 제목
- 뉴스 프로그램 안내
- 뉴스 모음
- 방송 편성표
- 단순 검색 결과
- 홍보성 기사
- 기사 내용이 거의 없는 항목


특히 제목에 다음과 같은 표현이 포함되어 있고
실제 사건 내용이 부족하다면 선택하지 마라.

"뉴스룸"

"뉴스특보"

"뉴스 모음"

"주요뉴스"

"오늘의 뉴스"

"뉴스 브리핑"

"뉴스라인"


==================================================
내용
==================================================

선택한 뉴스의 실제 기사 내용만 근거로 하라.

뉴스에 없는 사실을 만들어내지 마라.

기사에 명확하게 나오지 않은 내용을
추측해서 추가하지 마라.


가능하면 다음 내용을 포함하라.

첫 번째:
무슨 일이 있었는지.

두 번째:
누가 또는 어떤 기관이 관련되어 있는지.

세 번째:
왜 중요한지.


==================================================
길이
==================================================

전체 답변은 3~5문장으로 작성하라.

음성으로 들었을 때 자연스러워야 한다.

너무 길게 설명하지 마라.


==================================================
첫 문장
==================================================

첫 문장은 반드시 다음 중 하나의
자연스러운 형태로 시작하라.

"오늘의 주요 뉴스예요."

또는

"오늘 중요한 소식이 하나 들어왔어요."

또는

"오늘 눈여겨볼 만한 소식이 하나 있어요."


그 다음에는 바로 실제 사건 내용을 이야기하라.

예:

"오늘의 주요 뉴스예요.
오늘 ○○에서 ○○라는 일이 있었어요.
○○에 따르면 ..."
 

이런 식으로 이어가라.


==================================================
감정
==================================================

뉴스 내용에 맞춰 하나를 선택하라.

happy
surprised
sad
angry
thinking
neutral


일반적인 뉴스:
neutral

긍정적인 뉴스:
happy

충격적인 뉴스:
surprised

사고나 재난:
sad

강한 비판이 필요한 사건:
angry

복잡한 정책·경제·과학:
thinking


==================================================
응답 형식
==================================================

반드시 JSON으로만 응답하라.

{
    "reply": "뉴스 내용을 자연스럽게 설명하는 문장",
    "emotion": "neutral",
    "title": "선택한 실제 뉴스 제목"
}


JSON 이외의 내용을 출력하지 마라.

markdown을 사용하지 마라.


==================================================
뉴스 목록
==================================================

${newsText}

                    `,

                    config: {

                        responseMimeType:
                            'application/json',

                    },

                })


            console.log(
                '📰 Gemini 뉴스 분석 결과:'
            )

            console.log(
                response.text
            )


            // =================================================
            // JSON 변환
            // =================================================

            const result =
                JSON.parse(
                    response.text
                )


            // =================================================
            // 감정 검사
            // =================================================

            const allowedEmotions = [

                'happy',
                'surprised',
                'sad',
                'angry',
                'thinking',
                'neutral',

            ]


            const emotion =
                allowedEmotions.includes(
                    result.emotion
                )
                    ? result.emotion
                    : 'neutral'


            // =================================================
            // 로그
            // =================================================

            console.log(
                '📰 선택된 뉴스:',
                result.title
            )

            console.log(
                '📰 앨런:',
                result.reply
            )


            // =================================================
            // React 응답
            // =================================================

            res.json({

                reply:
                    result.reply,

                emotion:
                    emotion,

                title:
                    result.title || '',

            })


        } catch (error) {

            console.error(
                '📰 Gemini 뉴스 분석 오류:',
                error
            )


            res.status(500).json({

                error:
                    '뉴스를 분석하는 중 문제가 발생했습니다.',

            })
        }
    }
)


// =========================================================
// 서버 실행
// =========================================================

const PORT = 3000


app.listen(
    PORT,
    () => {

        console.log(
            `서버 실행: http://localhost:${PORT}`
        )

    }
)