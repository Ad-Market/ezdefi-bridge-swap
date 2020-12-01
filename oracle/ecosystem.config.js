module.exports = {
  apps : [{
    name: "watcher:signature-request",
    script: "./scripts/start-worker.sh",
    args: "watcher signature-request-watcher",
    env: {
      NODE_ENV: "production"
    }
  },{
    name: "watcher:collected-signatures",
    script: "./scripts/start-worker.sh",
    args: "watcher collected-signatures-watcher",
    env: {
      NODE_ENV: "production"
    }
  },{
    name: "sender:home",
    script: "./scripts/start-worker.sh",
    args: "sender home-sender",
    env: {
      NODE_ENV: "production"
    }
  },{
    name: "sender:foreign",
    script: "./scripts/start-worker.sh",
    args: "sender foreign-sender",
    env: {
      NODE_ENV: "production"
    }
  },{
    name: "watcher:transfer",
    script: "./scripts/start-worker.sh",
    args: "watcher transfer-watcher",
    env: {
      NODE_ENV: "production"
    }
  },]
}
