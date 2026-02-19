require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scraperService = require('./scraperService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    lastUpdate: scraperService.getLastUpdateTime()
  });
});

app.get('/api/bbb/news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const news = await scraperService.getLatestNews(limit);
    
    res.json({
      success: true,
      count: news.length,
      lastUpdate: scraperService.getLastUpdateTime(),
      news: news
    });
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/bbb/latest', async (req, res) => {
  try {
    const news = await scraperService.getLatestNews(1);
    
    if (news.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma notícia encontrada'
      });
    }
    
    res.json({
      success: true,
      lastUpdate: scraperService.getLastUpdateTime(),
      news: news[0]
    });
  } catch (error) {
    console.error('Erro ao buscar última notícia:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/bbb/refresh', async (req, res) => {
  try {
    await scraperService.scrapeNow();
    const news = await scraperService.getLatestNews(5);
    
    res.json({
      success: true,
      message: 'Scraping realizado com sucesso',
      count: news.length,
      lastUpdate: scraperService.getLastUpdateTime(),
      news: news
    });
  } catch (error) {
    console.error('Erro ao atualizar notícias:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/bbb/stats', async (req, res) => {
  try {
    const stats = scraperService.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📰 Scraping ativado: Site da Globo BBB`);
  
  await scraperService.initialize();
  
  console.log(`\n✅ API pronta para uso!`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/api/bbb/news`);
  console.log(`   - http://localhost:${PORT}/api/bbb/latest`);
});
