FROM node:11
COPY . /app
WORKDIR /app
RUN npm install
RUN npm rebuild bcrypt --update-binary
CMD ["node", "/app/src/app.js"]