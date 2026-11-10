// Static copy for the hotel app. The commission rate comes from the API (earnings terms, /v1/pricing).

export const REJECT_REASONS = ["An item is sold out", "Kitchen is too busy", "Closing soon", "Other"];
export const PREP_TIMES = [10, 15, 20, 25, 30, 40];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FAQ: [string, string][] = [
  ["An order is not showing. What do I do?", "Check that your store is switched to Open at the top and that this page is open with internet on. Turn on the sound so you hear new orders."],
  ["What happens if I do not accept an order?", "You have 2 minutes to accept. After that the order is cancelled and the customer is refunded automatically."],
  ["Who pays the delivery fee?", "The customer pays it and it goes fully to the delivery partner. InnTown's commission is only on your food, never on packaging or delivery."],
  ["How does the pickup code work?", "When the delivery partner arrives, ask for the 4-digit pickup code, type it in \"Hand over\", and the order will move to On the way."],
  ["How do I mark a dish as sold out?", "Go to Menu and switch off Available next to the dish. Customers will see it as Sold out straight away."],
  ["How does InnTown charge me?", "A small commission on the food value of each delivered order, lower than the big apps. Your first 30 days after approval are free. There is no monthly fee. Rejected or cancelled orders cost nothing."],
  ["When do I get paid?", "InnTown pays your food and packaging, less the commission, to your UPI ID every week. See Earnings for the details."],
];
