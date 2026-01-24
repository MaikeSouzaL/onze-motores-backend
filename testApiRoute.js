import axios from 'axios';

const testRoute = async () => {
  try {
    console.log("🔍 Testando rota GET http://localhost:3000/api/satellites/version ...");
    const response = await axios.get('http://localhost:3000/api/satellites/version');
    
    console.log("✅ Status:", response.status);
    console.log("📦 Dados:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error(`❌ Erro HTTP: ${error.response.status}`);
      console.error("📦 Dados:", error.response.data);
    } else {
      console.error("❌ Erro de conexão:", error.message);
    }
  }
};

testRoute();