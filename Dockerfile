FROM node:lts-alpine
WORKDIR /app
COPY . .
RUN npm i --omit=dev
#RUN npm i -g nodemon
EXPOSE 3000
CMD ["npm", "start"]

