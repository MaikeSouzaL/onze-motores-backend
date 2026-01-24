db.getSiblingDB('onze-motores').appconfigs.updateOne(
  {key: 'settings'},
  {$unset: {'api.production.port': '', 'api.development.port': ''}}
)
