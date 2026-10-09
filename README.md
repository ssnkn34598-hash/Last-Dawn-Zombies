# Последний рассвет (Last-Dawn-Zombies)

Зомби-шутер на чистом JS + canvas. Одна кодовая база — две площадки: Яндекс Игры и VK Игры.

## Запуск без сборки

Открой `index.html` в браузере (или любой локальный сервер). Платформа определяется сама
(`js/config.js` → `platform: 'auto'`): параметры запуска VK → VK, `/sdk.js` Яндекса → Яндекс,
иначе локальный режим с демо-рекламой. `?debug` включает отладочные клавиши.

## Платформы

| Файл | Что делает |
| --- | --- |
| `js/platform.js` | Общий интерфейс `Platform`: сохранения, реклама, пауза, соц-действия |
| `js/platform-yandex.js` | Адаптер Яндекс Игр (SDK `/sdk.js`) |
| `js/platform-vk.js` | Адаптер VK Игр (VK Bridge из `js/vendor/vk-bridge.min.js`) |
| `js/platform-local.js` | Локальный адаптер: localStorage и демо-реклама |
| `js/config.js` | Платформа, id приложения и сообщества ВК, флаг `SOCIAL_REWARDS` |

## Сборка

```
npm run build:yandex   # dist/yandex/ и dist/rassvet-yandex.zip (index.html в корне)
npm run build:vk       # dist/vk/ и dist/rassvet-vk.zip
npm run build          # обе
npm install            # один раз, перед deploy:vk
npm run deploy:vk      # сборка VK + загрузка на хостинг VK Mini Apps
```

`build.js` оставляет в `index.html` только скрипты своей площадки (`data-platform`) и
прописывает в `js/config.js` платформу, `app_id` из `vk-hosting-config.json` (или `VK_APP_ID`)
и id сообщества из `package.json → config.vkGroupId` (или `VK_GROUP_ID`).

Для CI деплой берёт токен из переменной окружения `MINI_APPS_ACCESS_TOKEN`.

## Баланс

```
node tools/balance.js [--all]
```
