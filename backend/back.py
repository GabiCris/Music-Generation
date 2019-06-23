from selenium import webdriver
from flask_cors import CORS, cross_origin
from flask import Flask
import os, zipfile
import json
import numpy as np
import pandas as pd
from keras.models import Sequential
from keras.layers import LSTM, Dropout, Dense, Activation, Embedding
import codecs
from flask import jsonify
import time
import sys
sys.path.insert(0, 'C:\\Users\\n3zqi\\Desktop\\Music Generation - ex\\Music-Generation-master\\Code')
import importlib
import Generate

app = Flask(__name__)
#cors = CORS(app)
#app.config['CORS_HEADERS'] = 'Content-Type'

# Initialize paths for data input and weights output
data_dir = "..\\Data\\"
data_file = "Nottingham_Jigs_Hornpipes.txt"
save_weights_dir = '..\\Trained_Weights\\Weights_Model_final\\'
log_dir = "..\\Data\\log.csv"
charToIndex_json = "char_to_index.json"

# Parameters
BATCH_SIZE = 16
SEQ_LENGTH = 64

def make_model(unique_chars):
    model = Sequential()

    # input shape is now (1,1) since we're only feeding the starting character - i.e. the starting note
    # for the generated sequence
    model.add(Embedding(input_dim = unique_chars, output_dim = 512, batch_input_shape = (1, 1)))

    model.add(LSTM(256, return_sequences = True, stateful = True))
    model.add(Dropout(0.2))

    model.add(LSTM(256, return_sequences = True, stateful = True))
    model.add(Dropout(0.2))

    model.add(LSTM(256, stateful = True))
    model.add(Dropout(0.2))

    model.add((Dense(unique_chars)))
    model.add(Activation("softmax"))

    return model


# In[12]:


def trim_sequence(generated_seq):
    #print("\nRAW generated sequence: \n" + generated_seq)

    # the generated sequence usually contains a few meaningless characters before a newline. Generally the rythm
    # and more cohesive notes are generated from the next line onward, so we remove the unnecessary characters.
    count = 0
    for char in generated_seq:
        count += 1
        if char == "\n" and count < len(generated_seq) and generated_seq[count] == "\n":
            break
    seq_trimmed_before = generated_seq[count+1:]

    # The training data contains multiple songs, each separated by three newline characters. The model has learned this pattern and
    # also adds three new line characters by itself. We would like to consider one song at time, so we ignore what follows after
    # these ending newlines.
    count = 0
    for char in seq_trimmed_before:
        count += 1
        if char == "\n" and count < len(seq_trimmed_before) and seq_trimmed_before[count] == "\n":
            break
    seq_trimmed = seq_trimmed_before[:count]

    return seq_trimmed


# In[21]:

file = open(os.path.join(data_dir, data_file), mode = 'r')
data = file.read()
file.close()
# Load character mapping
char_to_index = {char: x for (x, char) in enumerate(sorted(list(set(data))))}
print("Unique characters in the training data = {}".format(len(char_to_index)))
#with open(os.path.join(data_dir, charToIndex_json)) as f:
#    char_to_index = json.load(f)
index_to_char = {x:char for char, x in char_to_index.items()}
unique_chars = len(index_to_char)

model = make_model(unique_chars)
model.load_weights(save_weights_dir + "Weights_{}.h5".format(70))

def generate_sequence(initial_note, seq_length):

    #model.summary()
    sequence_index = [initial_note]
    for _ in range(seq_length):
        batch = np.zeros((1, 1))
        batch[0, 0] = sequence_index[-1]

        # predict the probabilities for the next input character
        predicted_probs = model.predict_on_batch(batch).ravel()
        # randomly sample the character based on the probabilities from the network
        char_sample = np.random.choice(range(unique_chars), size = 1, p = predicted_probs)
        sequence_index.append(char_sample[0])

    # obtain a string of the notes corresponding to each generated character
    gen_sequence = ''.join(index_to_char[c] for c in sequence_index)
    trimmed = trim_sequence(gen_sequence)
    return trimmed


# In[22]:

def getNewSong():
    epoch = 70
    initial_note = 42 # any integer between 0 and the number of uniqe characters in the data set
    seq_length = 600 # shouldn't be below 300 in order to generate a valid sequence

    music = generate_sequence(initial_note, seq_length)
    #print(generated, file=sys.stderr)
    #music = trim_sequence(generated)
    print("\nTRIMMED generated sequence: \n")
    print(music)
    return(music)



@app.route("/generate")
@cross_origin()
def home():

    options = webdriver.ChromeOptions()
    #chrome_options.add_argument("--headless")
    #driver.set_window_position(-10000,0)


    path = "C:\\Users\\n3zqi\\Desktop\\Music Generation - ex\\player\\generated"
    prefs = {}
    prefs["profile.default_content_settings.popups"]=0
    prefs["download.default_directory"]=path
    options.add_experimental_option("prefs", prefs)

    driver = webdriver.Chrome("C:\\Users\\n3zqi\\Desktop\\Music Generation - ex\\web\\chromedriver", chrome_options=options)

    song = ""
    song = getNewSong()

    # GET CONVERTED MIDI
    driver.get("http://www.mandolintab.net/abcconverter.php")
    textArea = driver.find_element_by_name("abc")

    '''
    song = """
X: 24
T: The Black Slender Boy
M: 3/4
L: 1/8
B: "O'Neill's 28"
N: "Moderate"
N: "Collected by J.O'Neill"
N:"Mollected by F. O'Neill"
Z: 1997 by John Chambers <jc@trillian.mit.edu>
M: 3/4
L: 1/8
K:A
(d>c) \
| B2 (GG) (E>D) | (D>F) (G2 GG) | {A}(EG) .G.A .B.A A | (Bd) e2 (dd) |
| (e{cd}d>).A (GG) | (GG) (.G2 .G) | (Gd) (Be) | (de) d2 Bc | A4 (DA) |
| (Bc) (ee) (dc) | (AG) (EG) | (eg) e2 | (ff) (dc) | dB A,z \
| D2 (GA) | (A>A) (EE) | (EA) (Bd) | (de) e2 | (.d c)A F ||

"""
    '''
    textArea.send_keys(song)
    button = driver.find_element_by_name("submit")
    button.click()
    el = driver.find_element_by_xpath("//*[text()='midi']")
    el.click()
    time.sleep(5)

    # READ MID
    filename = max([path +"\\"+ f for f in os.listdir(path) if f.endswith('.mid')], key=os.path.getctime)
    print(filename, file=sys.stderr)
    #CONVERT MIDI TO WAV
    driver.get("https://www.onlineconverter.com/midi-to-wav")
    driver.find_element_by_name("file").send_keys(filename)
    driver.find_element_by_id("convert-button").click()
    time.sleep(5)

    os.remove(path + "\\sample_notting.wav")
    new_file = os.path.join(path, "sample_notting.wav")
    os.rename(filename, new_file)

    #print(generated, file=sys.stderr)
    return jsonify({'midi_content':'SUCCESS', 'generated_song':song})

if __name__ == "__main__":
    app.run(debug=True)
