FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 5173

# --host 0.0.0.0 makes Vite listen on all interfaces so the host's browser can reach it
# through the port mapping
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
