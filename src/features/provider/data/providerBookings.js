export const todayBookingsList = [
  {
    id: '1',
    image: require('../../../../assets/images/user/user_1.jpg'),
    name: 'Andrei Popescu',
    work: 'Home Cleaning',
    time: '01:00 PM',
  },
  {
    id: '2',
    image: require('../../../../assets/images/user/user_5.jpg'),
    name: 'Ioana Dumitru',
    work: 'Home Cleaning',
    time: '03:30 PM',
  },
];

export const tomorrowBookingsList = [
  {
    id: '1',
    image: require('../../../../assets/images/user/user_7.jpg'),
    name: 'Andrei Marin',
    work: 'Home Cleaning',
    time: '09:00 AM',
  },
  {
    id: '2',
    image: require('../../../../assets/images/user/user_3.jpg'),
    name: 'Alexandra Matei',
    work: 'Home Cleaning',
    time: '11:00 AM',
  },
  {
    id: '3',
    image: require('../../../../assets/images/user/user_6.jpg'),
    name: 'Mihai Stan',
    work: 'Home Cleaning',
    time: '02:30 PM',
  },
];

export const nextBookingItem = {
  image: require('../../../../assets/images/user/user_4.jpg'),
  name: 'Alexandra Ionescu',
  work: 'Home Cleaning',
  time: '10:30 AM',
};

export function formatTimeToRomanian(time) {
  if (!time.includes(' ')) {
    return time;
  }

  const [clockPart, meridiem] = time.split(' ');
  const [rawHours, rawMinutes] = clockPart.split(':');
  let hours = Number(rawHours);

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${rawMinutes}`;
}

export function localizeService(work) {
  if (work === 'Home Cleaning') {
    return 'Curățenie locuință';
  }

  return work;
}

export function formatScheduleLabel(dayLabel, time) {
  return `${dayLabel} • ${formatTimeToRomanian(time)}`;
}
