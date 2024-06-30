FROM node:lts-alpine
WORKDIR /app
COPY . .
RUN npm i --omit=dev
EXPOSE 3000
CMD ["npm", "start"]

