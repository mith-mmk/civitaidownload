FROM node:lts-alpine
WORKDIR /app
RUN apk update && apk add bash git
RUN cd / && git clone  --depth 1 https://github.com/mith-mmk/civitaidownload.git && mv /civitaidownload/* /app
RUN cd /app & npm i --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
