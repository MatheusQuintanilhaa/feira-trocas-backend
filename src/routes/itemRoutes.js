// src/routes/itemRoutes.js

import { Router } from 'express';
import itemController from '../controllers/itemController.js';
import authentication from '../middlewares/authentication.js'; // Para proteger as rotas
import authorization from '../middlewares/authorization.js';   // Para rotas de admin 

const router = Router();

// Rotas de Item

// Rota para listar categorias (não precisa de autenticação para facilitar o uso)
router.get('/categories', itemController.getCategories);

// Rota para estatísticas (requer autenticação)
router.get('/stats', authentication, itemController.getStats);

// Rotas que exigem autenticação:
router.post('/', authentication, itemController.createItem); // Criar item
router.get('/', authentication, itemController.getAllItems);   // Listar todos os itens (com filtros)
router.get('/:id', authentication, itemController.getItemById); // Buscar item por ID

// Rotas que exigem autenticação e verificação de propriedade ou admin
router.put('/:id', authentication, itemController.updateItem); // Atualizar item (lógica de permissão dentro do controller)
router.delete('/:id', authentication, itemController.deleteItem); // Deletar item (lógica de permissão dentro do controller)

export default router;