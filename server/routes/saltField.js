// SaltField (盐场创地) REST API 路由层
// POST /api/salt-field/start - 启动单账号创地
// POST /api/salt-field/stop - 停止单账号创地  
// GET  /api/salt-field/status - 获取所有账号运行状态
// GET  /api/salt-field/enabled - 获取当前用户勾选的参与账号列表
// POST /api/salt-field/enabled - 保存当前用户的参与账号列表

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import saltFieldService from '../lib/legionWar/saltFieldService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xyzw-default-secret-key';

// 鉴权中间件
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, msg: '未提供认证令牌' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ ok: false, msg: '认证令牌无效或已过期' });
  }
};

// POST /start - 启动单账号创地
router.post('/start', authenticate, async (req, res) => {
  try {
    const { tokenId, tokenName } = req.body;
    if (!tokenId) {
      return res.json({ ok: false, msg: '缺少 tokenId 参数' });
    }
    
    const result = await saltFieldService.start(tokenId, req.userId, tokenName);
    res.json(result);
  } catch (error) {
    console.error('[SaltFieldRoute] start error:', error);
    res.json({ ok: false, msg: error.message });
  }
});

// POST /stop - 停止单账号创地
router.post('/stop', authenticate, async (req, res) => {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.json({ ok: false, msg: '缺少 tokenId 参数' });
    }
    
    saltFieldService.stop(tokenId);
    res.json({ ok: true, msg: `账号 ${tokenId} 已停止` });
  } catch (error) {
    console.error('[SaltFieldRoute] stop error:', error);
    res.json({ ok: false, msg: error.message });
  }
});

// GET /status - 获取所有账号运行状态
router.get('/status', authenticate, async (req, res) => {
  try {
    const statusMap = saltFieldService.getAllStatus();
    res.json({ ok: true, statusMap });
  } catch (error) {
    console.error('[SaltFieldRoute] status error:', error);
    res.json({ ok: false, msg: error.message });
  }
});

// GET /enabled - 获取当前用户勾选的参与账号列表
router.get('/enabled', authenticate, async (req, res) => {
  try {
    const enabled = await saltFieldService.getEnabledTokens(req.userId);
    res.json({ ok: true, tokenIds: enabled });
  } catch (error) {
    console.error('[SaltFieldRoute] getEnabled error:', error);
    res.json({ ok: false, msg: error.message });
  }
});

// POST /enabled - 保存当前用户的参与账号列表
router.post('/enabled', authenticate, async (req, res) => {
  try {
    const { tokenIds } = req.body;
    if (!Array.isArray(tokenIds)) {
      return res.json({ ok: false, msg: 'tokenIds 必须是数组' });
    }
    
    await saltFieldService.setEnabledTokens(req.userId, tokenIds);
    res.json({ ok: true, tokenIds });
  } catch (error) {
    console.error('[SaltFieldRoute] setEnabled error:', error);
    res.json({ ok: false, msg: error.message });
  }
});

export default router;
