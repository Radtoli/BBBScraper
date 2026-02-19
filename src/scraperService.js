const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

class ScraperService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); 
    this.newsData = [];
    this.lastUpdate = null;
    this.scrapeInterval = null;
    this.baseUrl = process.env.BBB_URL || 'https://gshow.globo.com/realities/bbb/';
    this.intervalTime = parseInt(process.env.SCRAPE_INTERVAL) || 300000; 
  }

  async initialize() {
    console.log('🔍 Iniciando serviço de scraping...');
    
    await this.scrapeNow();
    
    this.scrapeInterval = setInterval(() => {
      this.scrapeNow();
    }, this.intervalTime);
    
    console.log(`⏰ Scraping automático configurado (intervalo: ${this.intervalTime / 1000}s)`);
  }

  async scrapeNow() {
    try {
      console.log('📡 Buscando notícias do BBB...');
      const news = await this.scrapeBBBNews();
      
      if (news && news.length > 0) {
        this.newsData = news;
        this.lastUpdate = new Date();
        this.cache.set('news', news);
        console.log(`✅ ${news.length} notícias capturadas com sucesso`);
      } else {
        console.log('⚠️  Nenhuma notícia encontrada no scraping');
      }
      
      return news;
    } catch (error) {
      console.error('❌ Erro no scraping:', error.message);
      throw error;
    }
  }

  async scrapeBBBNews() {
    try {
      const urls = [
        'https://gshow.globo.com/realities/bbb/',
        'https://gshow.globo.com/realities/bbb/bbb-25/',
        'https://ge.globo.com/busca/?q=bbb',
        'https://g1.globo.com/busca/?q=bbb'
      ];

      let allNews = [];

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000
          });

          const $ = cheerio.load(response.data);
          let newsItems = [];

          const selectors = [
            '.feed-post-body',
            '.bastian-feed-item',
            '.widget--info',
            'article',
            '.block-item',
            '.feed-media-wrapper',
            '.post',
            '.materia'
          ];

          for (const selector of selectors) {
            $(selector).each((index, element) => {
              try {
                const $element = $(element);
                
                const title = $element.find('h2, h3, .feed-post-body-title, .post__title, a').first().text().trim()
                  || $element.find('a').attr('title')
                  || '';

                const link = $element.find('a').first().attr('href') || '';
                
                const description = $element.find('p, .feed-post-body-resumo, .post__excerpt').first().text().trim()
                  || '';

                const image = $element.find('img').first().attr('src') 
                  || $element.find('img').first().attr('data-src')
                  || '';

                const dateText = $element.find('time, .feed-post-datetime, .post__date').first().text().trim()
                  || $element.find('time').attr('datetime')
                  || '';

                if (title && link) {
                  newsItems.push({
                    title: title,
                    link: link.startsWith('http') ? link : `https://gshow.globo.com${link}`,
                    description: description,
                    image: image,
                    date: dateText || new Date().toISOString(),
                    source: url,
                    scrapedAt: new Date().toISOString()
                  });
                }
              } catch (err) {
              }
            });

            if (newsItems.length > 0) break;
          }

          allNews = allNews.concat(newsItems);
          
          if (newsItems.length > 0) {
            console.log(`  📄 ${newsItems.length} notícias encontradas em ${url}`);
          }
        } catch (err) {
          console.log(`  ⚠️  Erro ao acessar ${url}: ${err.message}`);
        }
      }

      const uniqueNews = [];
      const seenTitles = new Set();

      for (const item of allNews) {
        if (!seenTitles.has(item.title)) {
          seenTitles.add(item.title);
          uniqueNews.push(item);
        }
      }

      uniqueNews.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

      return uniqueNews;
    } catch (error) {
      console.error('Erro ao fazer scraping:', error.message);
      
      return this.getMockData();
    }
  }

  getMockData() {
    console.log('📝 Usando dados de exemplo (modo demonstração)');
    return [
      {
        title: 'BBB 25: Confira as últimas notícias do reality',
        link: 'https://gshow.globo.com/realities/bbb/',
        description: 'Acompanhe tudo sobre o Big Brother Brasil 25',
        image: 'https://s2-gshow.glbimg.com/bbb.jpg',
        date: new Date().toISOString(),
        source: 'demo',
        scrapedAt: new Date().toISOString()
      },
      {
        title: 'Paredão BBB 25: Veja quem está na berlinda esta semana',
        link: 'https://gshow.globo.com/realities/bbb/',
        description: 'Três brothers disputam a preferência do público',
        image: 'https://s2-gshow.glbimg.com/paredao.jpg',
        date: new Date(Date.now() - 3600000).toISOString(),
        source: 'demo',
        scrapedAt: new Date().toISOString()
      },
      {
        title: 'Prova do Líder BBB 25: Saiba quem venceu a disputa',
        link: 'https://gshow.globo.com/realities/bbb/',
        description: 'Novo líder foi definido na noite desta quinta-feira',
        image: 'https://s2-gshow.glbimg.com/lider.jpg',
        date: new Date(Date.now() - 7200000).toISOString(),
        source: 'demo',
        scrapedAt: new Date().toISOString()
      }
    ];
  }

  async getLatestNews(limit = 20) {
    // Usar cache se disponível
    const cachedNews = this.cache.get('news');
    if (cachedNews) {
      return cachedNews.slice(0, limit);
    }

    if (this.newsData.length > 0) {
      return this.newsData.slice(0, limit);
    }

    await this.scrapeNow();
    return this.newsData.slice(0, limit);
  }

  getLastUpdateTime() {
    return this.lastUpdate;
  }

  getStats() {
    return {
      totalNews: this.newsData.length,
      lastUpdate: this.lastUpdate,
      scrapeInterval: this.intervalTime / 1000,
      cacheEnabled: true,
      sources: [...new Set(this.newsData.map(n => n.source))],
      oldestNews: this.newsData.length > 0 ? this.newsData[this.newsData.length - 1].date : null,
      newestNews: this.newsData.length > 0 ? this.newsData[0].date : null
    };
  }

  destroy() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      console.log('🛑 Scraping automático finalizado');
    }
  }
}

module.exports = new ScraperService();
