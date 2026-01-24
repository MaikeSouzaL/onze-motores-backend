/**
 * Funcionario - cadastro de funcionários/colaboradores da oficina
 * 
 * Registra quem cria termos e quem marca como retirado
 */

import mongoose from "mongoose";

const FuncionarioSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true }, // Dono da oficina
    
    nome: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    
    // Identificador visual (iniciais, cor, etc)
    cor: { type: String, default: "#3b82f6" }, // Cor para identificação visual
    
    ativo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Índice para listagem do usuário ordenada por nome
FuncionarioSchema.index({ uid: 1, ativo: 1, nome: 1 });

export default mongoose.model("Funcionario", FuncionarioSchema);
