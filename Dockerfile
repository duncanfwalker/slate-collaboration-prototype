FROM node:boron

RUN npm install react-scripts --global

COPY package.json .

RUN npm install


EXPOSE 8080
CMD [ "npm", "run", "server" ]