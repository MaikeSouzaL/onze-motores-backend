import SavedPDF from '../models/SavedPDF.js';
import { getUserPermissions } from '../utils/permissionUtils.js';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';
import htmlPdf from 'html-pdf-node';
import { getMotorHTML } from '../utils/motorPDFHelper.js';
import { renderEsquemaToSVG } from '../utils/esquemaRenderer.js';

/**
 * @desc    Salvar registro de PDF
 * @route   POST /api/pdfs
 */
export const savePDF = async (req, res) => {
  const startTime = Date.now();
  try {
    const { uid, category, clientName, clientPhone, fileName, fileUrl, driveFileId, metadata } = req.body;

    console.log('[PDF] savePDF request', {
      uid,
      category,
      clientName,
      fileName,
      termoRetiradaId: metadata?.termoRetiradaId,
      hasFileUrl: !!fileUrl,
      hasDriveFileId: !!driveFileId,
    });

    if (!uid || !fileUrl) {
      console.error('[PDF] Dados incompletos', { uid: !!uid, fileUrl: !!fileUrl });
      return res.status(400).json({ success: false, message: 'Dados incompletos (uid, fileUrl)' });
    }

    // Verificar Permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    if (!isAdmin && config) {
      // Mapear categoria para permissão específica
      let allowed = true;
      
      // Normalizar categoria para lowercase para comparação
      const cat = category ? category.toLowerCase() : '';

      if (cat.includes('orçamento') || cat.includes('orcamento')) {
        allowed = config.canGenerateOrcamento;
      } else if (cat.includes('laudo')) {
        allowed = config.canGenerateLaudo;
      } else if (cat.includes('recibo')) {
        allowed = config.canGenerateRecibo;
      } else if (cat.includes('garantia')) {
        allowed = config.canGenerateGarantia;
      } else {
        // Fallback genérico
        allowed = config.canGeneratePDF;
      }

      if (!allowed) {
        console.warn('[PDF] Permission denied', { uid, category, plan: config.tier });
        return res.status(403).json({ 
          success: false, 
          message: 'Seu plano atual não permite gerar/salvar este tipo de documento.' 
        });
      }
    }

    const newPDF = await SavedPDF.create({
      uid,
      category,
      clientName,
      clientPhone,
      fileName,
      fileUrl,
      driveFileId,
      metadata
    });

    const duration = Date.now() - startTime;
    console.log('[PDF] ✅ PDF saved successfully', {
      pdfId: newPDF._id,
      uid,
      category,
      termoRetiradaId: metadata?.termoRetiradaId,
      duration: `${duration}ms`,
    });

    res.status(201).json({
      success: true,
      data: newPDF,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[PDF] ❌ Error saving PDF', {
      message: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Listar PDFs do usuário
 * @route   GET /api/pdfs/:uid
 */
export const getUserPDFs = async (req, res) => {
  try {
    const { uid } = req.params;
    const { category } = req.query;

    let query = { uid };
    if (category) {
      query.category = category;
    }

    const pdfs = await SavedPDF.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pdfs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Deletar PDF
 * @route   DELETE /api/pdfs/:id?uid=...
 */
export const deletePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID é obrigatório' });
    }

    const pdf = await SavedPDF.findById(id);

    if (!pdf) {
      return res.status(404).json({ success: false, message: 'PDF não encontrado' });
    }

    // Verificar se o PDF pertence ao usuário
    if (pdf.uid !== uid) {
      console.warn('[PDF] Tentativa de deletar PDF de outro usuário', { pdfUid: pdf.uid, requestUid: uid });
      return res.status(403).json({ success: false, message: 'Permissão negada' });
    }

    await SavedPDF.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'PDF removido do banco de dados',
      data: { driveFileId: pdf.driveFileId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar metadata do PDF
 * @route   PATCH /api/pdfs/:id/metadata?uid=...
 */
export const updatePDFMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata, uid } = req.body;

    if (!metadata) {
      return res.status(400).json({ success: false, message: 'Metadata é obrigatório' });
    }

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID é obrigatório' });
    }

    const pdf = await SavedPDF.findById(id);

    if (!pdf) {
      return res.status(404).json({ success: false, message: 'PDF não encontrado' });
    }

    // Verificar se o PDF pertence ao usuário
    if (pdf.uid !== uid) {
      console.warn('[PDF] Tentativa de atualizar PDF de outro usuário', { pdfUid: pdf.uid, requestUid: uid });
      return res.status(403).json({ success: false, message: 'Permissão negada' });
    }

    // Atualizar metadata (merge com existente)
    pdf.metadata = {
      ...pdf.metadata,
      ...metadata,
    };

    // Espelhar campos importantes no topo para exibição/lista
    if (typeof metadata.clientName === 'string') {
      const trimmed = metadata.clientName.trim();
      if (trimmed) pdf.clientName = trimmed;
    }

    if (typeof metadata.clientPhone === 'string') {
      const trimmedPhone = metadata.clientPhone.trim();
      pdf.clientPhone = trimmedPhone || pdf.clientPhone; // aceita vazio
    }

    await pdf.save();

    res.status(200).json({
      success: true,
      message: 'Metadata do PDF atualizado',
      data: pdf,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mescla PDF gerado do motor com PDF do Google Drive
 * @route   POST /api/pdfs/merge
 */
export const mergePDFs = async (req, res) => {
  try {
    const { pdfBase64, pdfDriveUrl } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'pdfBase64 é obrigatório',
      });
    }

    console.log('🔀 Iniciando mesclagem de PDFs...');
    
    // Converter PDF base64 para buffer
    const pdfBuffer1 = Buffer.from(pdfBase64, 'base64');
    
    // Criar documento PDF final
    const mergedPdf = await PDFDocument.create();
    
    // Adicionar primeiro PDF (dados do motor)
    console.log('📄 Carregando PDF dos dados do motor...');
    const pdf1 = await PDFDocument.load(pdfBuffer1);
    const pages1 = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
    pages1.forEach((page) => mergedPdf.addPage(page));
    console.log(`✅ ${pages1.length} página(s) adicionada(s) do PDF gerado`);

    // Se houver PDF do Drive, baixar e adicionar
    if (pdfDriveUrl) {
      try {
        console.log('📥 Baixando PDF do Google Drive...');
        const response = await axios.get(pdfDriveUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 segundos
        });
        
        const pdfBuffer2 = Buffer.from(response.data);
        
        console.log('📄 Carregando PDF do Drive...');
        const pdf2 = await PDFDocument.load(pdfBuffer2);
        const pages2 = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());
        pages2.forEach((page) => mergedPdf.addPage(page));
        console.log(`✅ ${pages2.length} página(s) adicionada(s) do PDF do Drive`);
      } catch (driveError) {
        console.warn('⚠️ Erro ao baixar/processar PDF do Drive:', driveError.message);
        // Continua sem o PDF do Drive
      }
    }

    // Salvar PDF mesclado
    console.log('💾 Gerando PDF mesclado...');
    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');

    console.log('✅ PDFs mesclados com sucesso!');
    
    res.status(200).json({
      success: true,
      pdfBase64: mergedPdfBase64,
      totalPages: mergedPdf.getPageCount(),
    });
  } catch (error) {
    console.error('❌ Erro ao mesclar PDFs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao mesclar PDFs',
      error: error.message,
    });
  }
};

/**
 * @desc    Gera PDF completo do motor (dados + anexo do Drive se houver)
 * @route   POST /api/pdfs/generate-motor
 */
export const generateMotorPDF = async (req, res) => {
  try {
    const {
      motor,
      empresa,
      logoBase64,
      fotosBase64 = [],
      fotoPlacaBase64,
      esquemaDados,
      pdfDriveUrl,
      pdfConfig,
    } = req.body;

    if (!motor || !empresa) {
      return res.status(400).json({
        success: false,
        message: 'Dados do motor e empresa são obrigatórios',
      });
    }

    console.log('📄 Gerando PDF do motor:', motor.modelo || 'sem modelo');
    
    // Configurações padrão se não foram enviadas
    const config = pdfConfig || {
      mostrarLogoNoHeader: true,
      mostrarLogoNoFooter: false,
    };
    
    console.log('⚙️ Configurações de logo:', config);

    // ------------------------------------------------------------
    // Compatibilidade/robustez: se o app NÃO enviar base64 (para evitar 413 no proxy),
    // o backend baixa as imagens a partir das URLs em `motor`/`empresa`.
    // ------------------------------------------------------------
    const downloadImageToDataUri = async (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 15 * 1024 * 1024,
          maxBodyLength: 15 * 1024 * 1024,
          validateStatus: (s) => s >= 200 && s < 300,
          headers: {
            // Alguns hosts (ex.: Google/Drive) podem bloquear requisições sem User-Agent
            'User-Agent': 'Mozilla/5.0 (OnzeMotoresPDF/1.0)',
          },
        });

        const contentTypeHeader =
          (response.headers && (response.headers['content-type'] || response.headers['Content-Type'])) ||
          'image/jpeg';
        const contentType = String(contentTypeHeader).split(';')[0] || 'image/jpeg';

        const base64 = Buffer.from(response.data).toString('base64');
        return `data:${contentType};base64,${base64}`;
      } catch (err) {
        console.warn('⚠️ Falha ao baixar imagem para PDF:', {
          url: String(url).slice(0, 120),
          message: err.message,
        });
        return null;
      }
    };

    const finalLogoBase64 =
      logoBase64 || (empresa?.logo ? await downloadImageToDataUri(empresa.logo) : null);

    const finalFotoPlacaBase64 =
      fotoPlacaBase64 || (motor?.fotoPlacaUrl ? await downloadImageToDataUri(motor.fotoPlacaUrl) : null);

    let finalFotosBase64 = Array.isArray(fotosBase64) ? fotosBase64.filter(Boolean) : [];
    if (finalFotosBase64.length === 0 && Array.isArray(motor?.fotosMotorUrls) && motor.fotosMotorUrls.length > 0) {
      // Baixar sequencialmente para reduzir pico de memória
      finalFotosBase64 = [];
      for (const fotoUrl of motor.fotosMotorUrls) {
        const dataUri = await downloadImageToDataUri(fotoUrl);
        if (dataUri) finalFotosBase64.push(dataUri);
      }
    }

    // Renderizar esquema como SVG se houver dados
    let esquemaImagem = null;
    if (esquemaDados) {
      console.log('🎨 Renderizando esquema de ligação...');
      esquemaImagem = renderEsquemaToSVG(esquemaDados);
      console.log('✅ Esquema renderizado');
    }

    // Gerar HTML do motor (passando as imagens processadas e configurações)
    const html = getMotorHTML(
      motor,
      empresa,
      finalLogoBase64,
      finalFotosBase64,
      esquemaImagem,
      finalFotoPlacaBase64,
      config
    );

    // Configurações para geração do PDF
    const options = {
      format: 'A4',
      margin: {
        top: '6px',
        right: '6px',
        bottom: '6px',
        left: '6px',
      },
      printBackground: true,
    };

    // Gerar PDF a partir do HTML
    console.log('🔨 Convertendo HTML para PDF...');
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    const pdfLength = pdfBuffer?.length ?? 0;
    console.log('✅ PDF dos dados gerado com sucesso', { bytes: pdfLength });

    // Em alguns cenários o html-pdf-node pode retornar buffer vazio sem lançar erro.
    // Isso causava resposta 200 com pdfBase64 vazio, e o app mostrava "Backend não retornou PDF válido".
    if (!pdfBuffer || typeof pdfBuffer.length !== 'number' || pdfBuffer.length < 1000) {
      throw new Error(`PDF gerado inválido (bytes=${pdfLength})`);
    }

    // Se houver PDF do Drive, mesclar
    if (pdfDriveUrl) {
      console.log('🔀 Mesclando com PDF do Google Drive...');
      
      try {
        // Criar documento PDF final
        const mergedPdf = await PDFDocument.create();

        // Adicionar PDF dos dados do motor
        const pdf1 = await PDFDocument.load(pdfBuffer);
        const pages1 = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
        pages1.forEach((page) => mergedPdf.addPage(page));
        console.log(`✅ ${pages1.length} página(s) dos dados adicionada(s)`);

        // Baixar e adicionar PDF do Drive
        console.log('📥 Baixando PDF do Google Drive...');
        const response = await axios.get(pdfDriveUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const pdfBuffer2 = Buffer.from(response.data);
        const pdf2 = await PDFDocument.load(pdfBuffer2);
        const pages2 = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());
        pages2.forEach((page) => mergedPdf.addPage(page));
        console.log(`✅ ${pages2.length} página(s) do Drive adicionada(s)`);

        // Salvar PDF mesclado
        const mergedPdfBytes = await mergedPdf.save();
        const finalPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');

        console.log('✅ PDF completo gerado e mesclado com sucesso!');

        return res.status(200).json({
          success: true,
          pdfBase64: finalPdfBase64,
          totalPages: mergedPdf.getPageCount(),
        });
      } catch (mergeError) {
        console.warn('⚠️ Erro ao mesclar com PDF do Drive:', mergeError.message);
        // Retorna apenas o PDF dos dados se falhar ao mesclar
        const pdfBase64 = pdfBuffer.toString('base64');
        return res.status(200).json({
          success: true,
          pdfBase64,
          totalPages: 1,
          warning: 'PDF do Drive não pôde ser anexado',
        });
      }
    }

    // Retornar apenas PDF dos dados (sem anexo do Drive)
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log('✅ PDF dos dados gerado com sucesso!');

    res.status(200).json({
      success: true,
      pdfBase64,
      totalPages: 1,
    });
  } catch (error) {
    console.error('❌ Erro ao gerar PDF do motor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar PDF do motor',
      error: error.message,
    });
  }
};