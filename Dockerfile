FROM node:lts-alpine
WORKDIR /app
RUN mkdir /app/data
COPY . .
RUN mv config/config-sample.json config/config.json
RUN npm i --omit=dev
EXPOSE 3000
CMD ["npm", "start"]

