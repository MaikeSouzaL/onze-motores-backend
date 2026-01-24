import Funcionario from "../models/Funcionario.js";

/**
 * @desc    Criar funcionário
 * @route   POST /api/funcionarios
 */
export const createFuncionario = async (req, res) => {
  try {
    const { uid, nome, email, cor } = req.body;

    if (!uid || !nome) {
      return res.status(400).json({ 
        success: false, 
        message: "UID e nome são obrigatórios" 
      });
    }

    const funcionario = await Funcionario.create({
      uid,
      nome,
      email,
      cor: cor || "#3b82f6",
      ativo: true,
    });

    return res.status(201).json({ 
      success: true, 
      data: funcionario 
    });
  } catch (error) {
    console.error("[FUNCIONARIO] Erro ao criar:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Listar funcionários do usuário
 * @route   GET /api/funcionarios?uid=...&ativo=true
 */
export const listFuncionarios = async (req, res) => {
  try {
    const { uid, ativo } = req.query;

    if (!uid) {
      return res.status(400).json({ 
        success: false, 
        message: "UID obrigatório" 
      });
    }

    const query = { uid };
    if (typeof ativo !== "undefined") {
      query.ativo = ativo === "true";
    }

    const funcionarios = await Funcionario.find(query)
      .sort({ nome: 1 });

    return res.status(200).json({ 
      success: true, 
      count: funcionarios.length,
      data: funcionarios 
    });
  } catch (error) {
    console.error("[FUNCIONARIO] Erro ao listar:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Atualizar funcionário
 * @route   PUT /api/funcionarios/:id?uid=...
 */
export const updateFuncionario = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;
    const { nome, email, cor, ativo } = req.body;

    if (!uid) {
      return res.status(400).json({ 
        success: false, 
        message: "UID obrigatório" 
      });
    }

    const funcionario = await Funcionario.findById(id);

    if (!funcionario) {
      return res.status(404).json({ 
        success: false, 
        message: "Funcionário não encontrado" 
      });
    }

    // Validar propriedade
    if (funcionario.uid !== uid) {
      console.warn('[FUNCIONARIO] Tentativa de atualizar funcionário de outro usuário', {
        funcionarioUid: funcionario.uid,
        requestUid: uid
      });
      return res.status(403).json({ 
        success: false, 
        message: "Permissão negada" 
      });
    }

    // Atualizar campos
    if (nome) funcionario.nome = nome;
    if (email !== undefined) funcionario.email = email;
    if (cor) funcionario.cor = cor;
    if (typeof ativo === "boolean") funcionario.ativo = ativo;

    await funcionario.save();

    return res.status(200).json({ 
      success: true, 
      data: funcionario 
    });
  } catch (error) {
    console.error("[FUNCIONARIO] Erro ao atualizar:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Deletar funcionário
 * @route   DELETE /api/funcionarios/:id?uid=...
 */
export const deleteFuncionario = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ 
        success: false, 
        message: "UID obrigatório" 
      });
    }

    const funcionario = await Funcionario.findById(id);

    if (!funcionario) {
      return res.status(404).json({ 
        success: false, 
        message: "Funcionário não encontrado" 
      });
    }

    // Validar propriedade
    if (funcionario.uid !== uid) {
      console.warn('[FUNCIONARIO] Tentativa de deletar funcionário de outro usuário', {
        funcionarioUid: funcionario.uid,
        requestUid: uid
      });
      return res.status(403).json({ 
        success: false, 
        message: "Permissão negada" 
      });
    }

    await Funcionario.deleteOne({ _id: id });

    return res.status(200).json({ 
      success: true, 
      message: "Funcionário deletado com sucesso" 
    });
  } catch (error) {
    console.error("[FUNCIONARIO] Erro ao deletar:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
