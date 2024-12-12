const express = require('express');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { getBotStatus, getAccessibleChannels, getRecentMessages, getBotInfo } = require('./bot');

const app = express();
const PORT = 8002; // process.env.PORT ||

// 로그 디렉토리 생성
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Discord 봇 초기화
require('./bot');

// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

// 로그 조회용 API 엔드포인트
app.get('/api/logs', (req, res) => {
  try {
    const logs = fs.readFileSync(path.join(logDir, 'combined.log'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          logger.error('로그 파싱 중 오류 발생:', error);
          return null;
        }
      })
      .filter(log => log !== null)
      .slice(-100); // 최근 100개 로그만 반환

    res.json(logs);
  } catch (error) {
    logger.error('로그 조회 중 오류 발생:', error);
    res.status(500).json({ error: '로그 조회 실패' });
  }
});

// console.log 대체
const originalConsoleLog = console.log;
console.log = (...args) => {
  logger.info(args.join(' '));
  originalConsoleLog.apply(console, args);
};

// console.error 대체 
const originalConsoleError = console.error;
console.error = (...args) => {
  logger.error(args.join(' '));
  originalConsoleError.apply(console, args);
};

// /api/bot-status 엔드포인트 추가
app.get('/api/bot-status', async (req, res) => {
    try {
        const status = await getBotStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: '봇 상태 조회 실패' });
    }
});

app.get('/api/channels', async (req, res) => {
  try {
    const channels = await getAccessibleChannels();
    res.json(channels);
  } catch (error) {
    logger.error('채널 조회 중 오류 발생:', error);
    res.status(500).json({ error: '채널 조회 실패' });
  }
});

app.get('/api/messages/:channelId', async (req, res) => {
  try {
    const messages = await getRecentMessages(req.params.channelId);
    res.json(messages);
  } catch (error) {
    logger.error('메시지 조회 중 오류 발생:', error);
    res.status(500).json({ error: '메시지 조회 실패' });
  }
});

// /api/bot-info 엔드포인트
app.get('/api/bot-info', async (req, res) => {
  try {
    const botInfo = await getBotInfo();
    res.json(botInfo);
  } catch (error) {
    logger.error('봇 정보 조회 중 오류 발생:', error);
    res.status(500).json({ error: '봇 정보 조회 실패' });
  }
});

// React 빌드된 파일 경로 설정
const buildPath = path.resolve(__dirname, 'build');

// 정적 파일 제공
app.use(express.static(buildPath));

// 모든 경로에 대해 index.html 반환
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server started on PORT ${PORT}`)
});