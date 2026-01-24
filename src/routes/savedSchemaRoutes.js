import express from 'express';
import * as savedSchemaController from '../controllers/savedSchemaController.js';

const router = express.Router();

// Rotas para esquemas salvos
router.post('/:uid/schemas', savedSchemaController.saveSchema);
router.get('/:uid/schemas', savedSchemaController.listSchemas);
router.get('/:uid/schemas/:schemaId', savedSchemaController.getSchema);
router.put('/:uid/schemas/:schemaId', savedSchemaController.updateSchema);
router.delete('/:uid/schemas/:schemaId', savedSchemaController.deleteSchema);
router.post('/:uid/schemas/:schemaId/duplicate', savedSchemaController.duplicateSchema);

export default router;
