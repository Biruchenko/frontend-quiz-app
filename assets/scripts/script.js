const themeBtn = document.querySelector('.switch-theme-btn');
const headerSection = document.querySelector('.header');
const mainSection = document.querySelector('.main');
const quizSection = document.querySelector('.quiz');
const scoreSection = document.querySelector('.score');
const optionSubjectBtn = document.querySelectorAll(
	'.btn-option.btn-option--subject'
);
const optionAnswerBtn = document.querySelectorAll(
	'.btn-option.btn-option--answer'
);

// In-memory cache for the quizzes data
let quizzesData;

// runtime state
let currentQuiz = null;
let currentIndex = 0;
let score = 0;

const submitBtn = document.getElementById('btn-submit');
const nextBtn = document.getElementById('btn-next');
const errorEl = document.querySelector('.menu__error');
const achievementSubjectText = document.querySelector(
	'.achievement__subject .logo__text'
);
const achievementPointNumber = document.querySelector(
	'.achievement__point-number'
);
const achievementPointTotal = document.querySelector(
	'.achievement__point-text-total'
);

async function fetchQuizData() {
	if (quizzesData) return quizzesData;
	try {
		const response = await fetch('./assets/files/data.json');
		if (!response.ok) throw new Error(`${response.status}`);
		quizzesData = await response.json();
		return quizzesData;
	} catch (err) {
		console.error('Failed to load data.json:', err);
		throw err;
	}
}

function slugForIcon(title) {
	return title
		.toLowerCase()
		.replace(/javascript/, 'js')
		.replace(/accessibility/, 'access')
		.replace(/\s+/g, '');
}

function renderHeaderLogo(quiz) {
	const logo = headerSection.querySelector('.header__logo');
	if (!logo) return;
	const iconClass = `icon--img-${slugForIcon(quiz.title)}`;
	logo.innerHTML = `
		<span class="logo__icon icon icon--img ${iconClass}" aria-hidden="true"></span>
		<span class="logo__text">${quiz.title}</span>
	`;
}

function renderQuestion(quiz, index = 0) {
	const q = quiz.questions[index];
	if (!q) return;

	// question number / total
	const questionNumberEl = quizSection.querySelector('.question-number');
	const questionQuantityEl = quizSection.querySelector('.question-quantity');
	if (questionNumberEl) questionNumberEl.textContent = String(index + 1);
	if (questionQuantityEl)
		questionQuantityEl.textContent = String(quiz.questions.length);

	// title / question text (use textContent to avoid interpreting HTML in questions)
	const titleEl = quizSection.querySelector('.menu__title.title-small');
	if (titleEl) titleEl.textContent = q.question;

	// progress bar
	const progressBar = quizSection.querySelector(
		'.menu__progress-bar.progress-bar'
	);
	if (progressBar) {
		const percent = Math.round(((index + 1) / quiz.questions.length) * 100);
		const inner = progressBar.querySelector('span');
		// leave 4px spacing on both sides by subtracting 8px from the computed percentage
		if (inner) inner.style.width = `calc(${percent}% - 8px)`;
		progressBar.setAttribute('aria-valuenow', String(percent));
	}

	// options list
	const list = quizSection.querySelector('.menu__list');
	if (!list) return;
	list.innerHTML = '';
	const optionSymbols = ['A', 'B', 'C', 'D', 'E', 'F'];
	q.options.forEach((optText, i) => {
		const li = document.createElement('li');
		li.className = 'menu__item';

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'menu__option btn-option btn-option--answer';

		const iconSpan = document.createElement('span');
		iconSpan.className =
			'btn-option__icon btn-option__icon--symbol icon icon--symbol';
		iconSpan.textContent = optionSymbols[i] || '';

		const textSpan = document.createElement('span');
		textSpan.className = 'btn-option__text';
		textSpan.textContent = optText;

		const icCorrect = document.createElement('span');
		icCorrect.className =
			'btn-option__icon-check btn-option__icon-check--correct';
		icCorrect.setAttribute('role', 'img');
		icCorrect.setAttribute('aria-hidden', 'true');
		icCorrect.setAttribute('aria-label', 'Correct answer');

		const icWrong = document.createElement('span');
		icWrong.className = 'btn-option__icon-check btn-option__icon-check--wrong';
		icWrong.setAttribute('role', 'img');
		icWrong.setAttribute('aria-hidden', 'true');
		icWrong.setAttribute('aria-label', 'Incorrect answer');

		btn.appendChild(iconSpan);
		btn.appendChild(textSpan);
		btn.appendChild(icCorrect);
		btn.appendChild(icWrong);

		li.appendChild(btn);
		list.appendChild(li);
	});
}

// Wire up subject buttons: fetch data once, find the selected quiz, render header logo + first question
optionSubjectBtn.forEach(item => {
	item.addEventListener('click', async () => {
		try {
			const title = item
				.querySelector('.btn-option__text')
				?.textContent?.trim();
			const data = await fetchQuizData();
			const found = Array.isArray(data.quizzes)
				? data.quizzes.find(
						q => q.title.toLowerCase() === (title || '').toLowerCase()
					)
				: null;
			if (!found) {
				console.error('Quiz not found for subject:', title);
				return;
			}

			// initialize state
			currentQuiz = found;
			currentIndex = 0;
			score = 0;

			mainSection.classList.add('hidden');
			quizSection.classList.remove('hidden');

			// reset UI
			if (errorEl) errorEl.classList.add('hidden');
			if (nextBtn) nextBtn.classList.add('hidden');
			if (submitBtn) submitBtn.classList.remove('hidden');

			renderHeaderLogo(found);
			renderQuestion(found, 0);
		} catch (err) {
			console.error(err);
		}
	});
});

// Theme change
if (themeBtn) {
	themeBtn.addEventListener('click', () => {
		const isPressed = themeBtn.getAttribute('aria-pressed') === 'true';
		const newState = !isPressed;
		themeBtn.setAttribute('aria-pressed', newState);
		const newLabel = newState
			? 'Switch to light theme'
			: 'Switch to dark theme';
		themeBtn.setAttribute('aria-label', newLabel);
		document.body.classList.toggle('dark-theme', newState);
	});
}

// Delegated click handler for selecting options
(function () {
	const status = document.getElementById('quiz-status');

	document.addEventListener('click', e => {
		const btn = e.target.closest('.btn-option');
		if (!btn) return;
		if (!btn.classList.contains('btn-option--answer')) return;

		// clear selection state on all answer options for the current question
		document.querySelectorAll('.btn-option.btn-option--answer').forEach(b => {
			b.classList.remove('selected', 'correct', 'wrong');
			delete b.dataset.state;
			const icC = b.querySelector('.btn-option__icon-check--correct');
			const icW = b.querySelector('.btn-option__icon-check--wrong');
			if (icC) icC.setAttribute('aria-hidden', 'true');
			if (icW) icW.setAttribute('aria-hidden', 'true');
		});

		// mark clicked as selected (visual feedback shown on submit)
		btn.dataset.state = 'selected';
		btn.classList.add('selected');
		const label =
			btn.querySelector('.btn-option__text')?.textContent?.trim() || 'Option';
		if (status) status.textContent = `${label} selected.`;
	});
})();

function showScore() {
	if (!currentQuiz) return;
	if (achievementSubjectText)
		achievementSubjectText.textContent = currentQuiz.title;
	if (achievementPointNumber)
		achievementPointNumber.textContent = String(score);
	if (achievementPointTotal)
		achievementPointTotal.textContent = String(currentQuiz.questions.length);

	quizSection.classList.add('hidden');
	scoreSection.classList.remove('hidden');
}

// submit handler
if (submitBtn) {
	submitBtn.addEventListener('click', () => {
		if (!currentQuiz) return;
		const selected = quizSection.querySelector(
			'.btn-option[data-state="selected"]'
		);
		if (!selected) {
			if (errorEl) errorEl.classList.remove('hidden');
			return;
		}
		if (errorEl) errorEl.classList.add('hidden');

		const selectedText = selected
			.querySelector('.btn-option__text')
			?.textContent?.trim();
		const correctAnswer = currentQuiz.questions[currentIndex].answer;

		// reveal correct answer
		const options = quizSection.querySelectorAll(
			'.btn-option.btn-option--answer'
		);
		options.forEach(opt => {
			const text = opt.querySelector('.btn-option__text')?.textContent?.trim();
			if (text === correctAnswer) {
				opt.classList.add('correct');
				const icC = opt.querySelector('.btn-option__icon-check--correct');
				if (icC) icC.removeAttribute('aria-hidden');
			}
		});

		// if selected is wrong, mark only selected as wrong
		if (selectedText !== correctAnswer) {
			selected.classList.add('wrong');
			const icW = selected.querySelector('.btn-option__icon-check--wrong');
			if (icW) icW.removeAttribute('aria-hidden');
		} else {
			// selected was correct, ensure score counted
			score += 1;
		}

		if (nextBtn) nextBtn.classList.remove('hidden');
		if (submitBtn) submitBtn.classList.add('hidden');
	});
}

// next handler
if (nextBtn) {
	nextBtn.addEventListener('click', () => {
		if (!currentQuiz) return;
		currentIndex += 1;
		if (currentIndex >= currentQuiz.questions.length) {
			showScore();
			return;
		}
		renderQuestion(currentQuiz, currentIndex);
		if (errorEl) errorEl.classList.add('hidden');
		if (nextBtn) nextBtn.classList.add('hidden');
		if (submitBtn) submitBtn.classList.remove('hidden');
	});
}

// play again
const playAgainBtn = document.getElementById('btn-play-again');
if (playAgainBtn) {
	playAgainBtn.addEventListener('click', () => {
		scoreSection.classList.add('hidden');
		mainSection.classList.remove('hidden');
		const logo = headerSection.querySelector('.header__logo');
		if (logo) logo.innerHTML = '';
	});
}
