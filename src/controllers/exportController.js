import Motor from '../models/Motor.js';
import User from '../models/User.js';
import Favorite from '../models/Favorite.js';
import { getUserPermissions } from '../utils/permissionUtils.js';

/**
 * @desc    Exportar motores para CSV
 * @route   GET /api/export/motors/csv
 */
export const exportMotorsToCSV = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Buscar motores conforme permissão
    let query = {};
    if (!isAdmin && config?.paidTier?.canOnlySeeOwnMotors) {
      query.uid = uid;
    }

    const motors = await Motor.find(query).sort({ criadoEm: -1 });

    // Gerar CSV
    const headers = [
      'ID',
      'Marca',
      'Modelo',
      'Pacote',
      'Voltagem',
      'Frequência',
      'Potência CV',
      'Potência KW',
      'RPM',
      'Corrente Nominal',
      'Fator de Serviço',
      'Tipo',
      'Carcaça',
      'Grau de Proteção',
      'Classe Isolamento',
      'Regime Trabalho',
      'Categoria',
      'Número Polos',
      'Rendimento',
      'Fator Potência',
      'Corrente Partida',
      'Conjugado Partida',
      'Conjugado Mínimo',
      'Conjugado Máximo',
      'Momento Inércia',
      'Massa',
      'Comprimento',
      'Altura',
      'Largura',
      'Diâmetro Ponta Eixo',
      'Comprimento Ponta Eixo',
      'Ranhuras',
      'Montagem',
      'Rolamento Dianteiro',
      'Rolamento Traseiro',
      'Lubrificação',
      'Temperatura Ambiente',
      'Altitude',
      'Cadastrado Por',
      'Data Cadastro'
    ];

    const csvRows = [headers.join(',')];

    motors.forEach(motor => {
      const row = [
        motor._id.toString(),
        escapeCSV(motor.marca),
        escapeCSV(motor.modelo),
        escapeCSV(motor.pacote),
        escapeCSV(motor.voltagem),
        escapeCSV(motor.frequencia),
        motor.potenciaCV || '',
        motor.potenciaKW || '',
        motor.rpm || '',
        motor.correnteNominal || '',
        motor.fatorServico || '',
        escapeCSV(motor.tipo),
        escapeCSV(motor.carcaca),
        escapeCSV(motor.grauProtecao),
        escapeCSV(motor.classeIsolamento),
        escapeCSV(motor.regimeTrabalho),
        escapeCSV(motor.categoria),
        motor.numeroPolos || '',
        motor.rendimento || '',
        motor.fatorPotencia || '',
        motor.correntePartida || '',
        motor.conjugadoPartida || '',
        motor.conjugadoMinimo || '',
        motor.conjugadoMaximo || '',
        motor.momentoInercia || '',
        motor.massa || '',
        motor.comprimento || '',
        motor.altura || '',
        motor.largura || '',
        motor.diametroPontaEixo || '',
        motor.comprimentoPontaEixo || '',
        motor.ranhuras || '',
        escapeCSV(motor.montagem),
        escapeCSV(motor.rolamentoDianteiro),
        escapeCSV(motor.rolamentoTraseiro),
        escapeCSV(motor.lubrificacao),
        motor.temperaturaAmbiente || '',
        motor.altitude || '',
        motor.uid || '',
        motor.criadoEm ? new Date(motor.criadoEm).toLocaleDateString('pt-BR') : ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Configurar headers para download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="motores_${Date.now()}.csv"`);
    
    // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
    res.send('\uFEFF' + csvContent);

  } catch (error) {
    console.error('❌ Erro ao exportar CSV:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Exportar motores para JSON (Backup completo)
 * @route   GET /api/export/motors/backup
 */
export const exportMotorsBackup = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    // Verificar permissões
    const { isAdmin } = await getUserPermissions(uid);

    // Apenas admin ou próprios motores
    let query = isAdmin ? {} : { uid };

    const motors = await Motor.find(query).sort({ criadoEm: -1 });

    // Buscar favoritos do usuário
    const favorites = await Favorite.find({ uid }).select('motorId');
    const favoriteIds = favorites.map(f => f.motorId.toString());

    // Buscar dados do usuário
    const user = await User.findOne({ uid });

    const backupData = {
      exportDate: new Date().toISOString(),
      exportedBy: uid,
      totalMotors: motors.length,
      user: {
        uid: user?.uid,
        email: user?.email,
        role: user?.role,
        createdAt: user?.createdAt
      },
      favorites: favoriteIds,
      motors: motors.map(motor => ({
        id: motor._id.toString(),
        ...motor.toObject()
      }))
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup_motores_${Date.now()}.json"`);
    res.send(JSON.stringify(backupData, null, 2));

  } catch (error) {
    console.error('❌ Erro ao exportar backup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Exportar relatório customizado de motores (dados estruturados para PDF)
 * @route   POST /api/export/motors/report
 */
export const exportMotorsReport = async (req, res) => {
  try {
    const { uid, filters, includeFields, groupBy } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    // Construir query baseada nos filtros
    let query = {};
    if (!isAdmin && config?.paidTier?.canOnlySeeOwnMotors) {
      query.uid = uid;
    }

    // Aplicar filtros customizados
    if (filters) {
      if (filters.marca) query.marca = new RegExp(filters.marca, 'i');
      if (filters.modelo) query.modelo = new RegExp(filters.modelo, 'i');
      if (filters.voltagem) query.voltagem = filters.voltagem;
      if (filters.potenciaCV) query.potenciaCV = filters.potenciaCV;
      if (filters.tipo) query.tipo = new RegExp(filters.tipo, 'i');
    }

    const motors = await Motor.find(query).sort({ criadoEm: -1 });

    // Filtrar campos a incluir
    let reportData = motors;
    if (includeFields && Array.isArray(includeFields)) {
      reportData = motors.map(motor => {
        const filtered = { id: motor._id.toString() };
        includeFields.forEach(field => {
          if (motor[field] !== undefined) {
            filtered[field] = motor[field];
          }
        });
        return filtered;
      });
    }

    // Agrupar dados se solicitado
    let grouped = null;
    if (groupBy) {
      grouped = motors.reduce((acc, motor) => {
        const key = motor[groupBy] || 'Não especificado';
        if (!acc[key]) acc[key] = [];
        acc[key].push(motor);
        return acc;
      }, {});
    }

    res.status(200).json({
      success: true,
      data: {
        total: motors.length,
        filters: filters || {},
        motors: reportData,
        grouped: grouped,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Exportar estatísticas dos motores
 * @route   GET /api/export/motors/stats
 */
export const exportMotorsStats = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    // Verificar permissões
    const { isAdmin, config } = await getUserPermissions(uid);

    let query = {};
    if (!isAdmin && config?.paidTier?.canOnlySeeOwnMotors) {
      query.uid = uid;
    }

    const motors = await Motor.find(query);

    // Calcular estatísticas
    const stats = {
      total: motors.length,
      byBrand: {},
      byVoltage: {},
      byPower: {},
      byType: {},
      byOwner: {},
      avgPowerCV: 0,
      avgRPM: 0,
      totalMass: 0
    };

    let sumPowerCV = 0;
    let sumRPM = 0;
    let countPowerCV = 0;
    let countRPM = 0;

    motors.forEach(motor => {
      // Por marca
      const brand = motor.marca || 'Não especificado';
      stats.byBrand[brand] = (stats.byBrand[brand] || 0) + 1;

      // Por voltagem
      const voltage = motor.voltagem || 'Não especificado';
      stats.byVoltage[voltage] = (stats.byVoltage[voltage] || 0) + 1;

      // Por potência (faixas)
      const power = motor.potenciaCV || 0;
      let powerRange = 'Não especificado';
      if (power > 0 && power <= 1) powerRange = '0-1 CV';
      else if (power > 1 && power <= 5) powerRange = '1-5 CV';
      else if (power > 5 && power <= 10) powerRange = '5-10 CV';
      else if (power > 10 && power <= 25) powerRange = '10-25 CV';
      else if (power > 25) powerRange = '> 25 CV';
      stats.byPower[powerRange] = (stats.byPower[powerRange] || 0) + 1;

      // Por tipo
      const type = motor.tipo || 'Não especificado';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Por proprietário
      const owner = motor.uid || 'Não especificado';
      stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;

      // Somas para médias
      if (motor.potenciaCV) {
        sumPowerCV += motor.potenciaCV;
        countPowerCV++;
      }
      if (motor.rpm) {
        sumRPM += motor.rpm;
        countRPM++;
      }
      if (motor.massa) {
        stats.totalMass += motor.massa;
      }
    });

    stats.avgPowerCV = countPowerCV > 0 ? (sumPowerCV / countPowerCV).toFixed(2) : 0;
    stats.avgRPM = countRPM > 0 ? (sumRPM / countRPM).toFixed(0) : 0;

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erro ao exportar estatísticas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Escapar valores para CSV (tratar vírgulas, aspas e quebras de linha)
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
