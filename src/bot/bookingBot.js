const { randomUUID } = require('crypto');

const COPY = {
  en: {
    welcome: (businessName) =>
      `Hello! Welcome to ${businessName}. Reply *1* for prices, *2* to make a booking, or type *help* at any time.`,
    prices: 'Our current services:',
    chooseService: 'Which service would you like? Reply with the number or service name.',
    chooseLocation: 'Will this be a *salon* appointment or a *house call*? Reply 1 for salon or 2 for house call.',
    askAddress: 'Please send the area and street address for the house call.',
    askDateTime: 'Please send your preferred date and time, for example: Friday 14:00.',
    askName: 'Thank you. What name should we use for the booking?',
    confirm: (booking, price) =>
      `Please confirm your booking:\n\nService: ${booking.service.name}\nAppointment: ${booking.locationType === 'house_call' ? 'House call' : 'Salon'}\n${booking.address ? `Address: ${booking.address}\n` : ''}Preferred time: ${booking.preferredDateTime}\nName: ${booking.customerName}\nEstimated price: ${price}\n\nReply *yes* to submit or *no* to cancel.`,
    confirmed: (reference) =>
      `Thank you — your booking request has been sent. Your reference is *${reference}*. We will confirm availability on WhatsApp shortly.`,
    cancelled: 'No problem — the booking has been cancelled. Reply *2* whenever you are ready to start again.',
    help: 'Reply *1* for prices, *2* to book, or *cancel* to stop a booking.',
    invalidService: 'I could not match that service. Please reply with a listed number or service name.',
    invalidLocation: 'Please reply *1* for salon or *2* for a house call.',
    loadShedding: (message) => message,
  },
  zu: {
    welcome: (businessName) =>
      `Sawubona! Wamukelekile e-${businessName}. Phendula *1* ukuthola amanani, noma *2* ukubhuka.`,
    prices: 'Nawa amasevisi ethu:',
    chooseService: 'Ufuna liphi isevisi? Phendula ngenombolo noma igama lesevisi.',
    chooseLocation: 'Ukubhuka kuzoba esalon noma ekhaya? Phendula 1 esalon noma 2 ekhaya.',
    askAddress: 'Sicela uthumele indawo nekheli lasekhaya.',
    askDateTime: 'Sicela uthumele usuku nesikhathi osithandayo, isibonelo: uLwesihlanu 14:00.',
    askName: 'Siyabonga. Ubani igama lokubhuka?',
    confirm: (booking, price) =>
      `Sicela uqinisekise:\n\nIsevisi: ${booking.service.name}\nIndawo: ${booking.locationType === 'house_call' ? 'Ikhaya' : 'Isalon'}\n${booking.address ? `Ikheli: ${booking.address}\n` : ''}Isikhathi: ${booking.preferredDateTime}\nIgama: ${booking.customerName}\nIntengo elinganisiwe: ${price}\n\nPhendula *yebo* ukuqinisekisa noma *cha* ukukhansela.`,
    confirmed: (reference) => `Siyabonga — isicelo sakho sithunyelwe. Inombolo yakho: *${reference}*.`,
    cancelled: 'Kulungile — ukubhuka kukhanseliwe. Phendula *2* uma usukulungele.',
    help: 'Phendula *1* amanani, *2* ukubhuka, noma *cancel* ukukhansela.',
    invalidService: 'Angiyitholanga leyo sevisi. Sicela phendula ngenombolo noma igama lesevisi.',
    invalidLocation: 'Sicela phendula *1* esalon noma *2* ekhaya.',
    loadShedding: (message) => message,
  },
  st: {
    welcome: (businessName) =>
      `Dumela! O amohelehile ho ${businessName}. Araba *1* bakeng sa ditheko, kapa *2* ho etsa booking.`,
    prices: 'Ditshebeletso tsa rona ke tsena:',
    chooseService: 'O batla tshebeletso efe? Araba ka nomoro kapa lebitso.',
    chooseLocation: 'Booking e tla ba salon kapa house call? Araba 1 bakeng sa salon kapa 2 bakeng sa house call.',
    askAddress: 'Ka kopo romela area le aterese bakeng sa house call.',
    askDateTime: 'Ka kopo romela letsatsi le nako eo o e batlang, mohlala: Labohlano 14:00.',
    askName: 'Kea leboha. Lebitso la booking ke mang?',
    confirm: (booking, price) =>
      `Ka kopo netefatsa booking:\n\nTshebeletso: ${booking.service.name}\nSebaka: ${booking.locationType === 'house_call' ? 'House call' : 'Salon'}\n${booking.address ? `Aterese: ${booking.address}\n` : ''}Nako: ${booking.preferredDateTime}\nLebitso: ${booking.customerName}\nTheko e lekantsweng: ${price}\n\nAraba *ee* ho netefatsa kapa *tjhe* ho hlakola.`,
    confirmed: (reference) => `Kea leboha — booking request e rometswe. Reference ya hao ke *${reference}*.`,
    cancelled: 'Ho lokile — booking e hlakotswe. Araba *2* ha o se o lokile.',
    help: 'Araba *1* bakeng sa ditheko, *2* bakeng sa booking, kapa *cancel* ho hlakola.',
    invalidService: 'Ha ke fumane tshebeletso eo. Ka kopo araba ka nomoro kapa lebitso.',
    invalidLocation: 'Ka kopo araba *1* bakeng sa salon kapa *2* bakeng sa house call.',
    loadShedding: (message) => message,
  },
};

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

function fillTemplate(text, values) {
  return String(text).replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_, key) => values[key] ?? '');
}

function createCopy(language, overrides, businessName, loadSheddingMessage, privacyNotice) {
  const base = COPY[language] || COPY.en;
  const custom = overrides?.[language] || {};
  const choose = (key, values = {}) =>
    Object.prototype.hasOwnProperty.call(custom, key) ? fillTemplate(custom[key], values) : base[key];

  return {
    welcome: (name = businessName) =>
      Object.prototype.hasOwnProperty.call(custom, 'welcome')
        ? fillTemplate(custom.welcome, { businessName: name })
        : base.welcome(name),
    consent: Object.prototype.hasOwnProperty.call(custom, 'consent')
      ? fillTemplate(custom.consent, { businessName })
      : privacyNotice,
    prices: choose('prices'),
    chooseService: choose('chooseService'),
    chooseLocation: choose('chooseLocation'),
    askAddress: choose('askAddress'),
    askDateTime: choose('askDateTime'),
    askName: choose('askName'),
    confirm: (booking, price) =>
      Object.prototype.hasOwnProperty.call(custom, 'confirm')
        ? fillTemplate(custom.confirm, {
            service: booking.service.name,
            appointment: booking.locationType === 'house_call' ? 'House call' : 'Salon',
            address: booking.address || '',
            preferredDateTime: booking.preferredDateTime,
            customerName: booking.customerName,
            price,
          })
        : base.confirm(booking, price),
    confirmed: (reference) =>
      Object.prototype.hasOwnProperty.call(custom, 'confirmed')
        ? fillTemplate(custom.confirmed, { reference })
        : base.confirmed(reference),
    cancelled: choose('cancelled'),
    help: choose('help'),
    invalidService: choose('invalidService'),
    invalidLocation: choose('invalidLocation'),
    loadShedding: () =>
      Object.prototype.hasOwnProperty.call(custom, 'loadShedding')
        ? fillTemplate(custom.loadShedding, { message: loadSheddingMessage, loadSheddingMessage })
        : base.loadShedding(loadSheddingMessage),
  };
}

function detectLanguage(text) {
  const value = normalize(text);
  if (/\b(sawubona|sanibonani|ngicela|yebo|cha|siyabonga)\b/.test(value)) return 'zu';
  if (/\b(dumela|kea leboha|kopo|ee|tjhe|amohelehile)\b/.test(value)) return 'st';
  return 'en';
}

function isYes(value) {
  return /^(yes|y|yebo|ee|confirm|confirm booking)$/i.test(normalize(value));
}

function isNo(value) {
  return /^(no|n|cha|tjhe|cancel|stop)$/i.test(normalize(value));
}

function formatMoney(amount, currency) {
  return `${currency}${Number(amount).toFixed(0)}`;
}

function makeReference() {
  return `SB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

class BookingBot {
  constructor(config, { onBooking, knowledgeBase } = {}) {
    this.config = config;
    this.onBooking = onBooking || (async () => {});
    this.knowledgeBase = knowledgeBase || null;
    this.copyOverrides = config.copyOverrides || {};
    this.consented = new Set();
    this.sessions = new Map();
  }

  copy(language) {
    return createCopy(
      language,
      this.copyOverrides,
      this.config.businessName,
      this.config.loadSheddingMessage,
      this.config.privacyNotice,
    );
  }

  priceFor(booking) {
    const servicePrice = booking.service.price;
    const surcharge =
      booking.locationType === 'house_call' ? this.config.houseCallFee.min : 0;
    return formatMoney(servicePrice + surcharge, this.config.currency);
  }

  serviceList() {
    return this.config.services
      .map((service, index) => `${index + 1}. ${service.name} — ${formatMoney(service.price, this.config.currency)}`)
      .join('\n');
  }

  findService(input) {
    const value = normalize(input).replace(/^service:/, '');
    const index = Number(value);
    if (Number.isInteger(index) && index >= 1 && index <= this.config.services.length) {
      return this.config.services[index - 1];
    }

    return this.config.services.find(
      (service) => normalize(service.id) === value || normalize(service.name) === value,
    );
  }

  startBooking(customer, language) {
    const session = {
      step: 'service',
      language,
      booking: {
        customerWhatsApp: customer,
        service: null,
        locationType: null,
        address: null,
        preferredDateTime: null,
        customerName: null,
      },
    };
    this.sessions.set(customer, session);
    return `${COPY[language].chooseService}\n\n${this.serviceList()}`;
  }

  async handleMessage({ customer, text, messageType = 'text' }) {
    if (!customer) throw new Error('A customer WhatsApp identifier is required.');
    const value = String(text || '').trim();
    const normalized = normalize(value);
    const active = this.sessions.get(customer);
    const language = active?.language || detectLanguage(value);
    const copy = this.copy(language);

    if (normalized === 'loadshedding' || normalized === 'load shedding') {
      return { text: copy.loadShedding(), language };
    }

    if (isNo(value) || normalized === 'cancel') {
      this.sessions.delete(customer);
      this.consented.delete(customer);
      return { text: copy.cancelled, language };
    }

    if (!active) {
      if (['1', 'prices', 'price', 'menu', 'amanani', 'ditheko'].includes(normalized)) {
        return { text: `${copy.prices}\n\n${this.serviceList()}\n\n${copy.help}`, language };
      }
      if (['2', 'book', 'booking', 'bhuka', 'etsa booking'].includes(normalized)) {
        if (this.config.requireConsent && !this.consented.has(customer)) {
          this.sessions.set(customer, {
            step: 'consent',
            language,
            booking: { customerWhatsApp: null },
          });
          return { text: copy.consent, language };
        }
        return { text: this.startBooking(customer, language), language };
      }
      const knowledgeAnswer = this.knowledgeBase ? await this.knowledgeBase.answer(value, language) : null;
      if (knowledgeAnswer) {
        return { text: knowledgeAnswer.answer, language, knowledgeBaseEntryId: knowledgeAnswer.id };
      }
      return { text: copy.welcome(this.config.businessName), language };
    }

    const { booking } = active;
    switch (active.step) {
      case 'consent':
        if (!isYes(value)) return { text: copy.consent, language };
        this.consented.add(customer);
        active.booking.customerWhatsApp = customer;
        active.step = 'service';
        return { text: `${copy.chooseService}\n\n${this.serviceList()}`, language };
      case 'service': {
        const service = this.findService(value);
        if (!service) return { text: copy.invalidService, language };
        booking.service = service;
        active.step = 'location';
        return { text: copy.chooseLocation, language };
      }
      case 'location': {
        if (['1', 'salon', 'location:salon'].includes(normalized)) {
          booking.locationType = 'salon';
          active.step = 'datetime';
          return { text: copy.askDateTime, language };
        }
        if (['2', 'house', 'house call', 'home', 'location:house'].includes(normalized)) {
          booking.locationType = 'house_call';
          active.step = 'address';
          return {
            text: `${copy.askAddress}\n\nHouse-call fees start from ${formatMoney(this.config.houseCallFee.min, this.config.currency)} and may increase up to ${formatMoney(this.config.houseCallFee.max, this.config.currency)} depending on distance.`,
            language,
          };
        }
        return { text: copy.invalidLocation, language };
      }
      case 'address':
        if (value.length < 5 || messageType === 'unsupported') {
          return { text: copy.askAddress, language };
        }
        booking.address = value;
        active.step = 'datetime';
        return { text: copy.askDateTime, language };
      case 'datetime':
        if (value.length < 4) return { text: copy.askDateTime, language };
        booking.preferredDateTime = value;
        active.step = 'name';
        return { text: copy.askName, language };
      case 'name':
        if (value.length < 2) return { text: copy.askName, language };
        booking.customerName = value;
        active.step = 'confirm';
        return { text: copy.confirm(booking, this.priceFor(booking)), language };
      case 'confirm':
        if (!isYes(value)) {
          return { text: copy.confirm(booking, this.priceFor(booking)), language };
        }
        const completedBooking = {
          ...booking,
          reference: makeReference(),
          estimatedPrice: this.priceFor(booking),
          createdAt: new Date().toISOString(),
        };
        await this.onBooking(completedBooking);
        this.sessions.delete(customer);
        return { text: copy.confirmed(completedBooking.reference), language, booking: completedBooking };
      default:
        this.sessions.delete(customer);
        return { text: copy.welcome(this.config.businessName), language };
    }
  }
}

module.exports = { BookingBot, COPY, createCopy, detectLanguage, fillTemplate, formatMoney };
