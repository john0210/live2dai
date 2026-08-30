
import Parser from 'rss-parser'

const parser = new Parser()

export default async function handler(req, res) {

    // =========================
    // CORS
    // =========================

    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    )

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
    )

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    )


    // =========================
    // OPTIONS 요청
    // =========================

    if (req.method === 'OPTIONS') {

        return res.status(200).end()

    }


    // =========================
    // GET만 허용
    // =========================

    if (req.method !== 'GET') {

        return res.status(405).json({

            error:
                'GET 요청만 사용할 수 있습니다.',

        })

    }


    // =========================
    // 검색어
    // =========================

    const query =
        req.query.q


    console.log(
        '📰 뉴스 검색 요청:',
        query
    )


    try {

        let queries = []


        // =====================================================
        // 오늘의 주요 뉴스
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
        // RSS 뉴스 검색 함수
        // =====================================================

        const fetchNewsByQuery =
            async (searchQuery) => {

                try {

                    const encodedQuery =
                        encodeURIComponent(
                            searchQuery
                        )


                    const newsUrl =
                        `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`


                    const feed =
                        await parser.parseURL(
                            newsUrl
                        )


                    return feed.items.map(
                        (item) => ({

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

                        })
                    )


                } catch (error) {

                    console.error(
                        `뉴스 검색 실패 (${searchQuery}):`,
                        error
                    )

                    return []

                }

            }


        // =====================================================
        // 여러 검색어 동시에 검색
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
        // 뉴스 합치기
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

        const seen =
            new Set()


        allNews =
            allNews.filter(
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


        // =====================================================
        // 빈약한 기사 제거
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


        // =====================================================
        // 응답
        // =====================================================

        return res.status(200).json({

            query:
                query ||
                '오늘 주요 뉴스',

            news:
                allNews,

        })


    } catch (error) {

        console.error(
            '📰 뉴스 검색 오류:',
            error
        )


        return res.status(500).json({

            error:
                '뉴스를 가져오는 중 오류가 발생했습니다.',

        })

    }

}

