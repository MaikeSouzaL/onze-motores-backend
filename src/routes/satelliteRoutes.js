import express from 'express';
import SignatureConfig from '../models/SignatureConfig.js';
import VersionApp from '../models/VersionApp.js';
import CoilTemplate from '../models/CoilTemplate.js';
import EsquemaPedido from '../models/EsquemaPedido.js';

const router = express.Router();

// --- Signature Config ---
router.get('/signature/:uid', async (req, res) => {
  try {
    const config = await SignatureConfig.findOne({ uid: req.params.uid });
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/signature', async (req, res) => {
  try {
    const { uid, ...data } = req.body;
    const config = await SignatureConfig.findOneAndUpdate(
      { uid },
      { uid, ...data },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Version App ---
router.get('/version', async (req, res) => {
  try {
    // Retorna a última versão ativa
    const version = await VersionApp.findOne({ active: true }).sort({ createdAt: -1 });
    
    if (!version) {
        return res.status(404).json({ success: false, message: "Nenhuma versão encontrada" });
    }

    res.json({ success: true, data: version });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Coil Templates ---
router.get('/coil-templates', async (req, res) => {
  try {
    const { uid } = req.query;
    const templates = await CoilTemplate.find({
      $or: [{ uid }, { isPublic: true }]
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/coil-templates', async (req, res) => {
  try {
    const template = await CoilTemplate.create(req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/coil-templates/:id', async (req, res) => {
  try {
    await CoilTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Template deletado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Esquema Pedidos ---
router.get('/esquema-pedidos', async (req, res) => {
  try {
    const { uid, status } = req.query;
    
    let query = {};
    
    // Se tiver uid, filtra pelo usuário (usuários comuns)
    if (uid) {
      query.uid = uid;
    }
    // Se não tiver uid mas tiver status, permite buscar todos com esse status (admins)
    // Se não tiver nem uid nem status, retorna todos (apenas admins devem fazer isso)
    
    // Se tiver status, filtra pelo status
    if (status) {
      query.status = status;
    }

    const pedidos = await EsquemaPedido.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: pedidos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/esquema-pedidos', async (req, res) => {
  try {
    const pedido = await EsquemaPedido.create(req.body);
    res.json({ success: true, data: pedido });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/esquema-pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, ...updateData } = req.body; // uid do requisitante + dados a atualizar

    // Buscar o pedido primeiro
    const pedido = await EsquemaPedido.findById(id);

    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }

    // Verificar se o usuário tem permissão (deve ser o dono ou admin)
    // Por enquanto, apenas o dono pode atualizar
    // TODO: Adicionar verificação de admin quando necessário
    if (uid && pedido.uid !== uid) {
      console.warn('[ESQUEMA-PEDIDOS] Tentativa de atualizar pedido de outro usuário', {
        pedidoUid: pedido.uid,
        requestUid: uid
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Permissão negada' 
      });
    }

    // Atualizar o pedido
    const pedidoAtualizado = await EsquemaPedido.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({ success: true, data: pedidoAtualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
