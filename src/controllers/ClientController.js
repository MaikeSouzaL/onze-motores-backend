import Client from "../models/Client.js";

/**
 * @desc    Listar clientes do usuário
 * @route   GET /api/clients
 */
export const getClients = async (req, res) => {
  try {
    const { uid, nome } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const query = { uid };

    if (nome) {
      query.nome = { $regex: nome, $options: "i" };
    }

    const clients = await Client.find(query).sort({ nome: 1 });

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Obter detalhes de um cliente
 * @route   GET /api/clients/:id
 */
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const client = await Client.findOne({ _id: id, uid });

    if (!client) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado" });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Criar novo cliente
 * @route   POST /api/clients
 */
export const createClient = async (req, res) => {
  try {
    const clientData = req.body;

    if (!clientData.uid || !clientData.nome) {
      return res.status(400).json({ success: false, message: "UID e Nome são obrigatórios" });
    }

    const client = await Client.create(clientData);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar cliente
 * @route   PUT /api/clients/:id
 */
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, ...updateData } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const client = await Client.findOneAndUpdate(
      { _id: id, uid },
      updateData,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado ou permissão negada" });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Excluir cliente
 * @route   DELETE /api/clients/:id
 */
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID obrigatório" });
    }

    const client = await Client.findOneAndDelete({ _id: id, uid });

    if (!client) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado ou permissão negada" });
    }

    res.status(200).json({
      success: true,
      message: "Cliente excluído com sucesso",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
