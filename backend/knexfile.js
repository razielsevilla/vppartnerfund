const path = require('path');

const productionClient = (process.env.DATABASE_CLIENT || 'sqlite').toLowerCase();

function productionConfig() {
  if (productionClient === 'pg' || productionClient === 'postgres' || productionClient === 'postgresql') {
    return {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      migrations: {
        directory: path.join(__dirname, 'src/migrations')
      }
    };
  }

  return {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.SQLITE_DB_PATH || path.join(__dirname, 'prod.db')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.pragma('journal_mode = WAL');
        conn.pragma('synchronous = NORMAL');
        cb();
      }
    },
    migrations: {
      directory: path.join(__dirname, 'src/migrations')
    }
  };
}

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, 'dev.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src/migrations')
    }
  },
  test: {
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src/migrations')
    }
  },
  production: {
    ...productionConfig()
  }
};
