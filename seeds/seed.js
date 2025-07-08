// seeds/seed.js
// Arquivo para popular o banco com dados iniciais

import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding do banco de dados...');

  // Criar usuário administrador
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@feiratrocas.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@feiratrocas.com',
      senha: adminPassword,
      isAdmin: true,
    },
  });

  // Criar usuários de exemplo
  const userPassword = await bcrypt.hash('123456', 10);
  
  const user1 = await prisma.usuario.upsert({
    where: { email: 'maria@exemplo.com' },
    update: {},
    create: {
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senha: userPassword,
      isAdmin: false,
    },
  });

  const user2 = await prisma.usuario.upsert({
    where: { email: 'joao@exemplo.com' },
    update: {},
    create: {
      nome: 'João Santos',
      email: 'joao@exemplo.com',
      senha: userPassword,
      isAdmin: false,
    },
  });

  // Criar itens de exemplo
  const itens = [
    {
      nome: 'Livro "Dom Casmurro"',
      descricao: 'Clássico da literatura brasileira em ótimo estado',
      categoria: 'Livros',
      usuarioId: user1.id,
      disponivelParaTroca: true,
    },
    {
      nome: 'Bicicleta Infantil Rosa',
      descricao: 'Bicicleta aro 16, pouco usada, ideal para crianças de 4-6 anos',
      categoria: 'Brinquedos',
      usuarioId: user1.id,
      disponivelParaTroca: true,
    },
    {
      nome: 'Smartphone Samsung Galaxy',
      descricao: 'Celular em bom estado, com carregador incluso',
      categoria: 'Eletrônicos',
      usuarioId: user2.id,
      disponivelParaTroca: true,
    },
    {
      nome: 'Camiseta Tamanho M',
      descricao: 'Camiseta azul básica, 100% algodão',
      categoria: 'Roupas',
      usuarioId: user2.id,
      disponivelParaTroca: true,
    },
    {
      nome: 'Violão Acústico',
      descricao: 'Violão usado mas em bom estado, cordas novas',
      categoria: 'Música',
      usuarioId: user1.id,
      disponivelParaTroca: true,
    },
  ];

  for (const item of itens) {
    await prisma.item.upsert({
      where: { 
        // Como não temos unique constraints além do id, vamos criar baseado em nome+usuarioId
        id: `${item.nome}-${item.usuarioId}`.replace(/\s+/g, '-').toLowerCase(),
      },
      update: {},
      create: item,
    });
  }

  console.log('✅ Seeding concluído com sucesso!');
  console.log(`👤 Admin criado: admin@feiratrocas.com (senha: admin123)`);
  console.log(`👤 Usuário 1: maria@exemplo.com (senha: 123456)`);
  console.log(`👤 Usuário 2: joao@exemplo.com (senha: 123456)`);
  console.log(`📦 ${itens.length} itens de exemplo criados`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
