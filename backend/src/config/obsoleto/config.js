{
  "development": {
    "dialect": "sqlite",
    "storage": "../database.sqlite",
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    }
  },
  "test": {
    "dialect": "sqlite",
    "storage": "../database_test.sqlite",
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    }
  },
  "production": {
    "dialect": "postgres",
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    },
    "use_env_variable": "DATABASE_URL"
  }
}