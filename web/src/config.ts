/** Where feedback and tester sign-ups go until there is an in-app form. */
export const CONTACT_EMAIL = 'QueerSafeSpace.lgbt@gmail.com';

export const FEEDBACK_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'QueerSafeSpace feedback',
)}`;

export const TESTER_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'I want to be a QueerSafeSpace tester',
)}&body=${encodeURIComponent(
  'Hi! I would like to help test QueerSafeSpace.\n\nPhone or computer: \nAnything in particular I can help with: \n',
)}`;

export const INSTAGRAM_HREF = 'https://www.instagram.com/queersafespace.lgbt';
