import mongoose from 'mongoose';
import SavedSchema from './src/models/SavedSchema.js';

mongoose.connect('mongodb://localhost:27017/onze-motores')
  .then(async () => {
    console.log('✅ Conectado ao MongoDB\n');
    
    // Buscar documento específico por nome ou o último
    const searchName = process.argv[2]; // nome do desenho como argumento
    const lastDoc = searchName 
      ? await SavedSchema.findOne({ nome: searchName }).sort({ criadoEm: -1 }).lean()
      : await SavedSchema.findOne().sort({ criadoEm: -1 }).lean();
    
    if (!lastDoc) {
      console.log('❌ Nenhum documento encontrado');
      
      const all = await SavedSchema.find().limit(5).lean();
      console.log('\n📋 Documentos disponíveis:');
      all.forEach(d => {
        console.log(`  - ${d.nome} (${d._id})`);
      });
    } else {
      console.log('=== ÚLTIMO DOCUMENTO SALVO ===');
      console.log('Nome:', lastDoc.nome);
      console.log('Descrição:', lastDoc.descricao);
      console.log('Criado em:', new Date(lastDoc.criadoEm).toLocaleString('pt-BR'));
      
      console.log('\n📊 Conteúdo do SchemaData:');
      console.log('  - Paths:', lastDoc.schemaData?.paths?.length || 0);
      console.log('  - Textos:', lastDoc.schemaData?.textos?.length || 0);
      console.log('  - Símbolos:', lastDoc.schemaData?.symbols?.length || 0);
      console.log('  - Polos:', lastDoc.schemaData?.polosConfig?.visible ? `✅ (${lastDoc.schemaData.polosConfig.poles} polos)` : '❌');
      console.log('  - Stator:', lastDoc.schemaData?.statorConfig?.visible ? `✅ (${lastDoc.schemaData.statorConfig.slots} slots)` : '❌');
      console.log('  - Bobinas Arc:', lastDoc.schemaData?.arcCoilConfig?.visible ? `✅ (${lastDoc.schemaData.arcCoilConfig.coils?.length || 0} bobinas)` : '❌');
      
      if (lastDoc.schemaData?.symbols?.length > 0) {
        console.log('\n🔣 Símbolos salvos:');
        lastDoc.schemaData.symbols.forEach((s, i) => {
          console.log(`  ${i+1}. Tipo: ${s.type}`);
          console.log(`     Label: "${s.label || 'N/A'}"`);
          console.log(`     Posição: (x:${s.x?.toFixed(1)}, y:${s.y?.toFixed(1)})`);
          console.log(`     Tamanho: ${s.size}px`);
          console.log(`     Cor: ${s.color}`);
          console.log('');
        });
        
        // Contar tipos de símbolos
        const tipos = {};
        lastDoc.schemaData.symbols.forEach(s => {
          tipos[s.type] = (tipos[s.type] || 0) + 1;
        });
        
        console.log('📈 Resumo por tipo:');
        Object.entries(tipos).forEach(([tipo, qtd]) => {
          console.log(`  - ${tipo}: ${qtd}`);
        });
      }
      
      if (lastDoc.schemaData?.textos?.length > 0) {
        console.log('\n📝 Textos salvos:');
        lastDoc.schemaData.textos.forEach((t, i) => {
          console.log(`  ${i+1}. "${t.texto}" (x:${t.x}, y:${t.y})`);
        });
      }
      
      if (lastDoc.schemaData?.paths?.length > 0) {
        console.log('\n✏️ Paths salvos:', lastDoc.schemaData.paths.length);
        const pathsTracejados = lastDoc.schemaData.paths.filter(p => p.dashArray);
        if (pathsTracejados.length > 0) {
          console.log(`   - Tracejados: ${pathsTracejados.length}`);
        }
      }

      // Detalhes de Polos
      if (lastDoc.schemaData?.polosConfig?.visible) {
        console.log('\n🎯 Polos configurados:');
        console.log(`   Quantidade: ${lastDoc.schemaData.polosConfig.poles}`);
        console.log(`   Raio Externo: ${lastDoc.schemaData.polosConfig.outerRadius}`);
        console.log(`   Raio Interno: ${lastDoc.schemaData.polosConfig.innerRadius}`);
        console.log(`   Tipo de Fase: ${lastDoc.schemaData.polosConfig.phaseType}`);
        console.log(`   Tipo de Máquina: ${lastDoc.schemaData.polosConfig.machineType}`);
      }

      // Detalhes de Stator
      if (lastDoc.schemaData?.statorConfig?.visible) {
        console.log('\n⚙️ Stator (Gabarito) configurado:');
        console.log(`   Slots: ${lastDoc.schemaData.statorConfig.slots}`);
        console.log(`   Raio: ${lastDoc.schemaData.statorConfig.radius}`);
      }

      // Detalhes de Bobinas Arc
      if (lastDoc.schemaData?.arcCoilConfig?.visible && lastDoc.schemaData.arcCoilConfig.coils?.length > 0) {
        console.log('\n🔄 Bobinas Arc (meia lua):');
        lastDoc.schemaData.arcCoilConfig.coils.forEach((coil, i) => {
          console.log(`   ${i+1}. Centro: (${coil.centerX?.toFixed(1)}, ${coil.centerY?.toFixed(1)})`);
          console.log(`      Raio: ${coil.radius}, Ângulos: ${coil.startAngle}° a ${coil.endAngle}°`);
          console.log(`      Cor: ${coil.color}, Label: ${coil.label || 'N/A'}`);
        });
      }
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
