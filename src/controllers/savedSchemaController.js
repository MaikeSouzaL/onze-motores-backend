import SavedSchema from "../models/SavedSchema.js";

const normalizeDashArray = (dashArray) => {
  if (!dashArray) return undefined;
  if (Array.isArray(dashArray)) {
    const nums = dashArray
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n));
    return nums.length ? nums : undefined;
  }
  if (typeof dashArray === "string") {
    const nums = dashArray
      .split(",")
      .map((s) => Number(String(s).trim()))
      .filter((n) => Number.isFinite(n));
    return nums.length ? nums : undefined;
  }
  // suporte a formatos tipo {0:10,1:10} ou {dashArray:[...]}
  if (typeof dashArray === "object") {
    if (Array.isArray(dashArray.dashArray))
      return normalizeDashArray(dashArray.dashArray);
    const values = Object.values(dashArray)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n));
    return values.length ? values : undefined;
  }
  return undefined;
};

// Salvar novo esquema
export const saveSchema = async (req, res) => {
  try {
    const { uid } = req.params;
    let {
      nome,
      descricao,
      schemaData,
      thumbnail,
      tags,
      modeloMotor,
      marca,
      potencia,
    } = req.body;

    // 🔍 DEBUG: Verificar tipo de schemaData recebido
    console.log("🔍 DEBUG saveSchema:");
    console.log("  - typeof schemaData:", typeof schemaData);
    console.log("  - typeof req.body:", typeof req.body);
    console.log("  - req.body keys:", Object.keys(req.body));

    // 🔧 Se schemaData vier como string, fazer parse
    if (typeof schemaData === "string") {
      console.log("⚠️ schemaData veio como STRING! Fazendo parse...");
      try {
        schemaData = JSON.parse(schemaData);
        console.log("✅ Parse bem sucedido");
      } catch (parseError) {
        console.error("❌ Erro ao fazer parse de schemaData:", parseError);
        return res.status(400).json({
          success: false,
          message: "schemaData inválido - não é um JSON válido",
        });
      }
    }

    console.log("  - typeof schemaData.symbols:", typeof schemaData?.symbols);
    console.log(
      "  - Array.isArray(schemaData.symbols):",
      Array.isArray(schemaData?.symbols)
    );
    if (schemaData?.symbols) {
      console.log("  - schemaData.symbols length:", schemaData.symbols.length);
      console.log("  - schemaData.symbols[0]:", schemaData.symbols[0]);
      console.log("  - typeof symbols[0]:", typeof schemaData.symbols[0]);
    }

    if (!nome || !schemaData) {
      return res.status(400).json({
        success: false,
        message: "Nome e dados do esquema são obrigatórios",
      });
    }

    // 🔍 DEBUG: Ver exatamente o que será passado ao Mongoose
    console.log("📦 Dados que serão salvos no Mongoose:");
    console.log("   - schemaData.symbols type:", typeof schemaData.symbols);
    console.log(
      "   - schemaData.symbols is Array:",
      Array.isArray(schemaData.symbols)
    );
    console.log(
      "   - schemaData.symbols:",
      JSON.stringify(schemaData.symbols, null, 2)
    );

    // Normalizar paths (principalmente dashArray) para garantir persistência
    const normalizedPaths = (schemaData?.paths || []).map((p) => ({
      path: p.path,
      color: p.color,
      strokeWidth: p.strokeWidth,
      dashArray: normalizeDashArray(p.dashArray),
    }));

    const newSchema = new SavedSchema({
      uid,
      nome,
      descricao,
      schemaData: {
        paths: normalizedPaths,
        textos: schemaData.textos || [],
        symbols: schemaData.symbols || [],
        statorConfig: schemaData.statorConfig || {},
        coilConfig: schemaData.coilConfig || {},
        arcCoilConfig: schemaData.arcCoilConfig || {},
        legendConfig: schemaData.legendConfig || {},
        polosConfig: schemaData.polosConfig || {},
        canvasSize: schemaData.canvasSize || {},
        timestamp: schemaData.timestamp,
        version: schemaData.version,
      },
      thumbnail,
      tags: tags || [],
      modeloMotor,
      marca,
      potencia,
    });

    console.log("🔍 Após criar instância do modelo:");
    console.log(
      "   - newSchema.schemaData.symbols type:",
      typeof newSchema.schemaData.symbols
    );
    console.log(
      "   - newSchema.schemaData.symbols is Array:",
      Array.isArray(newSchema.schemaData.symbols)
    );

    console.log("💾 Tentando salvar no MongoDB...");
    const savedDoc = await newSchema.save();
    console.log("✅ Documento salvo com sucesso! ID:", savedDoc._id);
    console.log("   - Nome salvo:", savedDoc.nome);
    console.log(
      "   - Símbolos salvos:",
      savedDoc.schemaData?.symbols?.length || 0
    );
    console.log(
      "   - Textos salvos:",
      savedDoc.schemaData?.textos?.length || 0
    );

    res.status(201).json({
      success: true,
      message: "Esquema salvo com sucesso!",
      schema: savedDoc,
    });
  } catch (error) {
    console.error("❌ Erro ao salvar esquema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao salvar esquema",
      error: error.message,
    });
  }
};

// Listar esquemas do usuário
export const listSchemas = async (req, res) => {
  try {
    const { uid } = req.params;
    const { search, limit = 50, skip = 0 } = req.query;

    let query = { uid };

    // Se houver busca, adicionar ao query
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: "i" } },
        { descricao: { $regex: search, $options: "i" } },
        { modeloMotor: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const schemas = await SavedSchema.find(query)
      .sort({ criadoEm: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      // Retornar schemaData para renderização SVG das miniaturas
      .lean();

    const total = await SavedSchema.countDocuments(query);

    res.json({
      success: true,
      schemas,
      total,
      hasMore: parseInt(skip) + parseInt(limit) < total,
    });
  } catch (error) {
    console.error("❌ Erro ao listar esquemas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar esquemas",
      error: error.message,
    });
  }
};

// Obter esquema específico com dados completos
export const getSchema = async (req, res) => {
  try {
    const { uid, schemaId } = req.params;

    const schema = await SavedSchema.findOne({ _id: schemaId, uid });

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: "Esquema não encontrado",
      });
    }

    res.json({
      success: true,
      schema,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar esquema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar esquema",
      error: error.message,
    });
  }
};

// Atualizar esquema
export const updateSchema = async (req, res) => {
  try {
    const { uid, schemaId } = req.params;
    const {
      nome,
      descricao,
      schemaData,
      thumbnail,
      tags,
      modeloMotor,
      marca,
      potencia,
    } = req.body;

    const schema = await SavedSchema.findOne({ _id: schemaId, uid });

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: "Esquema não encontrado",
      });
    }

    // Atualizar campos
    if (nome) schema.nome = nome;
    if (descricao !== undefined) schema.descricao = descricao;
    if (schemaData) {
      const normalizedPaths = (schemaData?.paths || []).map((p) => ({
        path: p.path,
        color: p.color,
        strokeWidth: p.strokeWidth,
        dashArray: normalizeDashArray(p.dashArray),
      }));

      schema.schemaData = {
        ...schemaData,
        paths: normalizedPaths,
      };
    }
    if (thumbnail !== undefined) schema.thumbnail = thumbnail;
    if (tags) schema.tags = tags;
    if (modeloMotor !== undefined) schema.modeloMotor = modeloMotor;
    if (marca !== undefined) schema.marca = marca;
    if (potencia !== undefined) schema.potencia = potencia;

    schema.atualizadoEm = Date.now();

    await schema.save();

    res.json({
      success: true,
      message: "Esquema atualizado com sucesso!",
      schema,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar esquema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar esquema",
      error: error.message,
    });
  }
};

// Deletar esquema
export const deleteSchema = async (req, res) => {
  try {
    const { uid, schemaId } = req.params;

    const schema = await SavedSchema.findOneAndDelete({ _id: schemaId, uid });

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: "Esquema não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Esquema deletado com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar esquema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar esquema",
      error: error.message,
    });
  }
};

// Duplicar esquema
export const duplicateSchema = async (req, res) => {
  try {
    const { uid, schemaId } = req.params;
    const { nome } = req.body;

    const originalSchema = await SavedSchema.findOne({ _id: schemaId, uid });

    if (!originalSchema) {
      return res.status(404).json({
        success: false,
        message: "Esquema não encontrado",
      });
    }

    const duplicatedSchema = new SavedSchema({
      uid,
      nome: nome || `${originalSchema.nome} (Cópia)`,
      descricao: originalSchema.descricao,
      schemaData: originalSchema.schemaData,
      thumbnail: originalSchema.thumbnail,
      tags: originalSchema.tags,
      modeloMotor: originalSchema.modeloMotor,
      marca: originalSchema.marca,
      potencia: originalSchema.potencia,
    });

    await duplicatedSchema.save();

    res.status(201).json({
      success: true,
      message: "Esquema duplicado com sucesso!",
      schema: duplicatedSchema,
    });
  } catch (error) {
    console.error("❌ Erro ao duplicar esquema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao duplicar esquema",
      error: error.message,
    });
  }
};
