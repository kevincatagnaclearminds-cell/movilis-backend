import 'dotenv/config';
import { testConnection } from '../src/config/postgres';

async function main() {
  console.log('🔍 Verificando variables de entorno...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ NO configurada');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurada' : '❌ NO configurada');
  console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || '⚠️ No configurada (usará *)');
  console.log('P12_BASE64:', process.env.P12_BASE64 ? '✅ Configurada' : '❌ NO configurada');
  console.log('P12_PASSWORD:', process.env.P12_PASSWORD ? '✅ Configurada' : '❌ NO configurada');
  console.log('\n🔌 Probando conexión a Supabase...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n✅ ¡Conexión exitosa!');
    process.exit(0);
  } else {
    console.log('\n❌ Error de conexión');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

