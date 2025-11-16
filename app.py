from flask import Flask, jsonify, send_from_directory
from game_data import GAME_DATA
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/game-data')
def get_game_data():
    return jsonify(GAME_DATA)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

