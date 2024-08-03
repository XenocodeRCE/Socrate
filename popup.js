document.addEventListener('DOMContentLoaded', () => {
  const textList = document.getElementById('textList');
  const qcmPage = document.getElementById('qcmPage');
  const qcmContent = document.getElementById('qcmContent');
  const qcmContainer = document.getElementById('qcmContainer');
  const backButton = document.getElementById('backButton');
  const verifyQCMButton = document.getElementById('verifyQCM');
  let currentQCM = null;
  let currentQCMs = []; // Store the current set of QCMs

  // Load texts and QCMs from local storage
  chrome.storage.local.get({texts: [], qcms: [], reminders: {}}, (result) => {
    const {texts, qcms, reminders} = result;
    texts.forEach((text, index) => {
      const div = document.createElement('div');
      div.className = 'text-entry';
      div.innerHTML = `
        <span>${text}</span>
        <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M3 6l3 18h12l3-18H3zm17-3H4V1h4.5l1-1h5l1 1H20v2z"/>
        </svg>
        <svg class="checklist-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.59L10.41 11 9 12.41l-2.59-2.58L5 12.41 9 16.41 18 7.41l-1.41-1.41L10 13.59z"/>
        </svg>
        <div class="reminder-icons">
          <span class="icon ${reminders[index] >= 1 ? 'checked' : ''}">✅</span>
          <span class="icon ${reminders[index] >= 2 ? 'checked' : ''}">◻️</span>
          <span class="icon ${reminders[index] >= 4 ? 'checked' : ''}">◻️</span>
          <span class="icon ${reminders[index] >= 7 ? 'checked' : ''}">◻️</span>
          <span class="icon ${reminders[index] >= 14 ? 'checked' : ''}">◻️</span>
          <span class="icon ${reminders[index] >= 30 ? 'checked' : ''}">◻️</span>
        </div>
      `;

      // Add delete functionality
      div.querySelector('.delete-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        removeText(index);
      });

      // Add generate QCM functionality
      div.querySelector('.checklist-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        generateQCM(text, index);
      });

      // Check if there are QCMs associated with this text
      const qcm = qcms.find(q => q.text === text);
      if (!qcm) {
        div.classList.add('grayed-out');
      } else {
        div.addEventListener('click', () => {
          currentQCMs = qcm.qcm;
          displayQCM(currentQCMs);
        });
      }

      textList.appendChild(div);
    });
  });

  // Function to create the message to be sent to the API
  function createMessage(text) {
    return `
      Vous êtes une IA qui génère des QCM d'autotests à partir de texte pour aider des élèves à réviser.
      Les questions doivent être claires, distinctes, et doivent permettre d'avancer pédagogiquement.
      
      Le format des QCM que tu dois générer :
      
      [
      {
          "question": "Qui a essayé de prendre l'Argolide à Héra ?",
          "choices": [
              "Zeus",
              "Poséidon",
              "Inachos",
              "Astérion"
          ],
          "answer": "Poséidon"
      },
      {
          "question": "Pourquoi Poséidon a-t-il refusé de comparaître devant ses pairs olympiens ?",
          "choices": [
              "Il était d'accord avec leur jugement.",
              "Il pensait qu'ils étaient prévenus contre lui.",
              "Il voulait leur offrir des cadeaux.",
              "Il n'était pas au courant de la convocation."
          ],
          "answer": "Il pensait qu'ils étaient prévenus contre lui."
      },
      {
          "question": "Quelle a été la conséquence du refus de Poséidon de comparaître devant les dieux olympiens ?",
          "choices": [
              "Il a été banni de l'Olympe.",
              "Zeus a soumis l'affaire aux dieux-fleuves pour jugement.",
              "Héra a cédé l'Argolide à Poséidon.",
              "Poséidon a gagné le combat."
          ],
          "answer": "Zeus a soumis l'affaire aux dieux-fleuves pour jugement."
      }
      ]
      
      Génère jusqu'à cinq questions.
      
      Voici le texte :
      \`\`\`
      ${text}
      \`\`\`
    `;
  }

  // Function to clean the extracted JSON string
  function clean_json_string(jsonString) {
    // Remove any preamble such as "json" from the beginning of the string
    jsonString = jsonString.replace(/^json/, '').trim();
    // Remove escape characters
    return jsonString.replace(/\\n/g, '').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\&/g, '&').replace(/\\r/g, '').replace(/\\t/g, '').replace(/\\b/g, '').replace(/\\f/g, '').replace("```json", "").replace("```", "");
  }

  // Shuffle array function to randomize choices
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Function to generate QCM
  function generateQCM(text, textId) {
    const message = createMessage(text);
    console.log('Envoi de la requête API pour le texte:', text);

    fetch('https://www.phorm.ai/api/db/generate_answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: message,
        project: '7bd6a01d-bad3-473d-b9b6-fd634fb6a4f6',
        repos: ['https://github.com/xenocoderce/philosofiche/tree/main']
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(responseJson => {
        const answer = responseJson.answer;
        if (answer) {
          const cleanedJsonResponse = clean_json_string(answer);
          console.log('Chaîne JSON nettoyée:', cleanedJsonResponse);
          return JSON.parse(cleanedJsonResponse);
        } else {
          throw new Error('La réponse de l\'API ne contient pas la clé "answer".');
        }
      })
      .then(data => {
        console.log('Réponse de l\'API:', data);
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Réponse de l\'API invalide');
        }

        chrome.storage.local.get({qcms: [], reminders: {}}, (result) => {
          const qcms = result.qcms;
          const reminders = result.reminders;
          qcms.push({text: text, qcm: data});
          reminders[textId] = 0; // Initialize reminder count
          chrome.storage.local.set({qcms: qcms, reminders: reminders}, () => {
            console.log('QCM ajouté à la base de données locale');
            scheduleReminders(textId); // Schedule reminders
            location.reload(); // Reload to update the UI
          });
        });
      })
      .catch(error => {
        console.error('Erreur:', error);
        alert('Une erreur s\'est produite lors de la génération du QCM. Veuillez réessayer s.v.p.');
      });
  }

  // Function to display a random QCM from the list
  function displayQCM(qcms) {
    const index = Math.floor(Math.random() * qcms.length);
    currentQCM = qcms[index];

    qcmContent.innerHTML = '';
    const questionDiv = document.createElement('div');
    questionDiv.className = 'qcm-question';
    questionDiv.innerHTML = `<p>${currentQCM.question}</p>`;

    const choicesList = document.createElement('ul');
    choicesList.className = 'qcm-choices';
    shuffleArray(currentQCM.choices).forEach((choice, i) => {
      const choiceItem = document.createElement('li');
      choiceItem.innerHTML = `
        <label>
          <input type="radio" name="question" value="${choice}">
          ${choice}
        </label>
      `;
      choicesList.appendChild(choiceItem);
    });

    questionDiv.appendChild(choicesList);
    qcmContent.appendChild(questionDiv);

    qcmPage.classList.add('active');
  }

  // Verify QCM button click handler
  verifyQCMButton.addEventListener('click', () => {
    const selectedChoice = document.querySelector('input[name="question"]:checked');
    if (selectedChoice) {
      if (selectedChoice.value === currentQCM.answer) {
        alert('Bonne réponse !');
        confetti(); // Trigger confetti effect
        // Load a new QCM after checking the answer
        currentQCMs = currentQCMs.filter(q => q.question !== currentQCM.question);
        if (currentQCMs.length > 0) {
          displayQCM(currentQCMs);
        } else {
          alert('Félicitations, vous avez terminé tous les QCMs pour ce texte !');
          qcmPage.classList.remove('active');
        }
      } else {
        alert(`Mauvaise réponse. La bonne réponse est : ${currentQCM.answer}`);
      }
    } else {
      alert('Veuillez sélectionner une réponse.');
    }
  });

  // Back button click handler
  backButton.addEventListener('click', () => {
    qcmPage.classList.remove('active');
  });

  // Function to remove text from the list
  function removeText(index) {
    chrome.storage.local.get({texts: [], qcms: []}, (result) => {
      const texts = result.texts;
      const qcms = result.qcms;

      const text = texts[index];
      const updatedQcms = qcms.filter(q => q.text !== text);

      texts.splice(index, 1);

      chrome.storage.local.set({texts: texts, qcms: updatedQcms}, () => {
        // Refresh the text list
        textList.innerHTML = '';
        texts.forEach((text, newIndex) => {
          const div = document.createElement('div');
          div.className = 'text-entry';
          div.innerHTML = `
            <span>${text}</span>
            <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M3 6l3 18h12l3-18H3zm17-3H4V1h4.5l1-1h5l1 1H20v2z"/>
            </svg>
            <svg class="checklist-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14.59L10.41 11 9 12.41l-2.59-2.58L5 12.41 9 16.41 18 7.41l-1.41-1.41L10 13.59z"/>
            </svg>
            <div class="reminder-icons">
              <span class="icon ${reminders[newIndex] >= 1 ? 'checked' : ''}">✅</span>
              <span class="icon ${reminders[newIndex] >= 2 ? 'checked' : ''}">◻️</span>
              <span class="icon ${reminders[newIndex] >= 4 ? 'checked' : ''}">◻️</span>
              <span class="icon ${reminders[newIndex] >= 7 ? 'checked' : ''}">◻️</span>
              <span class="icon ${reminders[newIndex] >= 14 ? 'checked' : ''}">◻️</span>
              <span class="icon ${reminders[newIndex] >= 30 ? 'checked' : ''}">◻️</span>
            </div>
          `;

          // Add delete functionality
          div.querySelector('.delete-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            removeText(newIndex);
          });

          // Add generate QCM functionality
          div.querySelector('.checklist-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            generateQCM(text, newIndex);
          });

          // Check if there are QCMs associated with this text
          const qcm = updatedQcms.find(q => q.text === text);
          if (!qcm) {
            div.classList.add('grayed-out');
          } else {
            div.addEventListener('click', () => {
              currentQCMs = qcm.qcm;
              displayQCM(currentQCMs);
            });
          }

          textList.appendChild(div);
        });
      });
    });
  }

  // Function to schedule reminders
  function scheduleReminders(textId) {
    const reminderTimes = [1, 2, 4, 7, 14, 30]; // days
    const now = Date.now();
    reminderTimes.forEach((days) => {
      const alarmTime = now + days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      chrome.alarms.create(`QCM_Reminder_${textId}_${days}`, { when: alarmTime });
    });
  }
});