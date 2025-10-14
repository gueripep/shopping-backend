module.exports = {
  apps : [{
    name   : "shopping-backend",
    script : "./server.js",
    env_production: {
       NODE_ENV: "production"
    }
  }]
}