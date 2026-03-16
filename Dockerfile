FROM node:22-alpine

WORKDIR /app
COPY package.json tsconfig.base.json .
COPY apps ./apps
COPY packages ./packages

RUN npm install

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "run", "start"]
