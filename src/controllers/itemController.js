// src/controllers/itemController.js

import prisma from '../db.js'; // Importa a instância do Prisma

// Categorias permitidas (pode ser movido para um arquivo de configuração)
const CATEGORIAS_PERMITIDAS = [
  'Livros',
  'Roupas', 
  'Brinquedos',
  'Eletrônicos',
  'Ferramentas',
  'Casa e Jardim',
  'Esportes',
  'Música',
  'Outros'
];

class ItemController {
  // Criar um novo item
  async createItem(req, res) {
    const { nome, descricao, categoria, imagemUrl, disponivelParaTroca } = req.body;
    // O ID do usuário vem do token JWT, que é anexado ao request pelo middleware de autenticação
    const usuarioId = req.userId; 

    // Validação básica
    if (!nome || !categoria || !usuarioId) {
      return res.status(400).json({ message: 'Nome, categoria e ID do usuário são obrigatórios.' });
    }

    // Validação de categoria
    if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
      return res.status(400).json({ 
        message: `Categoria inválida. Categorias permitidas: ${CATEGORIAS_PERMITIDAS.join(', ')}` 
      });
    }

    try {
      const newItem = await prisma.item.create({
        data: {
          nome,
          descricao,
          categoria,
          imagemUrl,
          disponivelParaTroca: disponivelParaTroca !== undefined ? disponivelParaTroca : true,
          usuario: {
            connect: { id: usuarioId }, // Conecta o item ao usuário que o criou
          },
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          categoria: true,
          imagemUrl: true,
          disponivelParaTroca: true,
          usuarioId: true, // Adiciona o ID do usuário na resposta
          createdAt: true,
          updatedAt: true,
        },
      });
      return res.status(201).json(newItem);
    } catch (error) {
      console.error('Erro ao criar item:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao criar item.' });
    }
  }

  // Listar todos os itens
  async getAllItems(req, res) {
    // Extrair parâmetros de query para filtros e busca
    const { categoria, search, disponivelParaTroca, usuarioId } = req.query;
    
    // Construir objeto where dinamicamente
    const where = {};
    
    // Filtro por categoria
    if (categoria) {
      where.categoria = categoria;
    }
    
    // Filtro por disponibilidade
    if (disponivelParaTroca !== undefined) {
      where.disponivelParaTroca = disponivelParaTroca === 'true';
    }
    
    // Filtro por usuário específico
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    // Busca por palavras-chave (nome ou descrição)
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } }
      ];
    }

    try {
      const items = await prisma.item.findMany({
        where,
        select: {
          id: true,
          nome: true,
          descricao: true,
          categoria: true,
          imagemUrl: true,
          disponivelParaTroca: true,
          usuarioId: true,
          usuario: { // Inclui informações do usuário dono do item
            select: { id: true, nome: true, email: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }, // Ordenar por mais recentes primeiro
      });
      return res.status(200).json(items);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao buscar itens.' });
    }
  }

  // Buscar item por ID
  async getItemById(req, res) {
    const { id } = req.params;

    try {
      const item = await prisma.item.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          descricao: true,
          categoria: true,
          imagemUrl: true,
          disponivelParaTroca: true,
          usuarioId: true,
          usuario: {
            select: { id: true, nome: true, email: true },
          },
          createdAt: true,
          updatedAt: true,
          propostasOfertadas: true, // Opcional: incluir propostas onde este item foi ofertado
          propostasDesejadas: true, // Opcional: incluir propostas onde este item foi desejado
        },
      });

      if (!item) {
        return res.status(404).json({ message: 'Item não encontrado.' });
      }
      return res.status(200).json(item);
    } catch (error) {
      console.error('Erro ao buscar item por ID:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao buscar item.' });
    }
  }

  // Atualizar um item existente
  async updateItem(req, res) {
    const { id } = req.params;
    const { nome, descricao, categoria, imagemUrl, disponivelParaTroca } = req.body;
    const usuarioId = req.userId; // ID do usuário autenticado

    // Validação de categoria se fornecida
    if (categoria && !CATEGORIAS_PERMITIDAS.includes(categoria)) {
      return res.status(400).json({ 
        message: `Categoria inválida. Categorias permitidas: ${CATEGORIAS_PERMITIDAS.join(', ')}` 
      });
    }

    try {
      // 1. Verificar se o item existe e se o usuário autenticado é o dono
      const existingItem = await prisma.item.findUnique({
        where: { id },
      });

      if (!existingItem) {
        return res.status(404).json({ message: 'Item não encontrado para atualização.' });
      }

      if (existingItem.usuarioId !== usuarioId) {
        return res.status(403).json({ message: 'Você não tem permissão para atualizar este item.' });
      }

      // 2. Atualizar o item
      const updatedItem = await prisma.item.update({
        where: { id },
        data: {
          nome,
          descricao,
          categoria,
          imagemUrl,
          disponivelParaTroca,
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          categoria: true,
          imagemUrl: true,
          disponivelParaTroca: true,
          usuarioId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return res.status(200).json(updatedItem);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Item não encontrado para atualização.' });
      }
      console.error('Erro ao atualizar item:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao atualizar item.' });
    }
  }

  // Deletar um item
  async deleteItem(req, res) {
    const { id } = req.params;
    const usuarioId = req.userId; // ID do usuário autenticado

    try {
      // 1. Verificar se o item existe e se o usuário autenticado é o dono
      const existingItem = await prisma.item.findUnique({
        where: { id },
      });

      if (!existingItem) {
        return res.status(404).json({ message: 'Item não encontrado para exclusão.' });
      }

      // Além de verificar se é o dono, um administrador também pode deletar

      // Para este controller, vamos exigir que seja o dono OU um admin.
      if (existingItem.usuarioId !== usuarioId && !req.isAdmin) { // req.isAdmin é setado pelo middleware de autenticação
        return res.status(403).json({ message: 'Você não tem permissão para deletar este item.' });
      }


      // 2. Deletar o item
      await prisma.item.delete({
        where: { id },
      });
      return res.status(204).send(); // 204 No Content para exclusão bem-sucedida
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Item não encontrado para exclusão.' });
      }
      // Se houver propostas associadas, o Prisma pode retornar um erro de Foreign Key
      if (error.code === 'P2003') { 
        return res.status(409).json({ message: 'Não é possível deletar o item, pois ele está associado a uma ou mais propostas de troca.' });
      }
      console.error('Erro ao deletar item:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao deletar item.' });
    }
  }

  // Listar todas as categorias disponíveis
  async getCategories(req, res) {
    try {
      const categories = await prisma.item.findMany({
        select: {
          categoria: true,
        },
        distinct: ['categoria'],
        where: {
          disponivelParaTroca: true, // Apenas itens disponíveis
        },
      });
      
      // Extrair apenas os nomes das categorias
      const categoryNames = categories.map(item => item.categoria).filter(Boolean);
      
      return res.status(200).json(categoryNames);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao buscar categorias.' });
    }
  }

  // Obter estatísticas gerais da plataforma
  async getStats(req, res) {
    try {
      const [
        totalItens,
        itensDisponiveis,
        totalPropostas,
        propostasAceitas,
        totalUsuarios,
        categorias
      ] = await prisma.$transaction([
        prisma.item.count(),
        prisma.item.count({ where: { disponivelParaTroca: true } }),
        prisma.proposta.count(),
        prisma.proposta.count({ where: { status: 'aceita' } }),
        prisma.usuario.count(),
        prisma.item.groupBy({
          by: ['categoria'],
          _count: {
            categoria: true,
          },
          where: {
            disponivelParaTroca: true,
          },
        }),
      ]);

      const stats = {
        totalItens,
        itensDisponiveis,
        totalPropostas,
        propostasAceitas,
        totalUsuarios,
        itensPorCategoria: categorias.map(cat => ({
          categoria: cat.categoria,
          quantidade: cat._count.categoria,
        })),
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ message: 'Erro interno do servidor ao buscar estatísticas.' });
    }
  }
}

export default new ItemController();