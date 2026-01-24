import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      index: true,
    }, // ID do usuário
    motorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Motor",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "favoritos", // Forçar o uso da coleção existente na imagem
  }
);

// Índice único para garantir que um usuário não favorite o mesmo motor 2x
favoriteSchema.index({ uid: 1, motorId: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
