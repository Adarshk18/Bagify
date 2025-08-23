# Bagify
A Full stack e-commerce platform for Modern &amp; Trendy Bags.

![WhatsApp Image 2025-08-23 at 20 28 29_31f3064e](https://github.com/user-attachments/assets/03f927bb-7558-439a-b4dc-663871f913ec)
![WhatsApp Image 2025-08-23 at 19 05 17_2428838c](https://github.com/user-attachments/assets/4e157fb5-231d-4d4b-be7d-ba3de2bb7607)
![WhatsApp Image 2025-08-23 at 19 05 34_693c067d](https://github.com/user-attachments/assets/a5aae3ba-6267-4169-9d9a-a70c46575e0f)
![WhatsApp Image 2025-08-23 at 19 05 51_0be5cab2](https://github.com/user-attachments/assets/7adbee3f-fd71-414b-b426-a91183afe6ef)
![WhatsApp Image 2025-08-23 at 19 06 15_cf7060f3](https://github.com/user-attachments/assets/de55bab8-6053-4e8a-b032-454efefaf58d)
![WhatsApp Image 2025-08-23 at 19 06 35_c93e6cf1](https://github.com/user-attachments/assets/22655af1-4509-432f-8518-2364a276f4d9)
![WhatsApp Image 2025-08-23 at 19 06 58_6a271920](https://github.com/user-attachments/assets/69e7f8c7-a093-425d-9d7e-0f5ec841c574)
![WhatsApp Image 2025-08-23 at 19 08 00_ecf8eca9](https://github.com/user-attachments/assets/f522356e-bd12-4a77-8029-813b33eef472)
![WhatsApp Image 2025-08-23 at 19 09 07_a3697d38](https://github.com/user-attachments/assets/bac88854-3a11-4889-a072-3aa27301dd4e)
![WhatsApp Image 2025-08-23 at 19 10 21_17cbbb16](https://github.com/user-attachments/assets/5ac0b11d-50e3-41cb-8487-cfa735c6d2c0)
![WhatsApp Image 2025-08-23 at 19 11 02_46babcc7](https://github.com/user-attachments/assets/cd4b35e8-a3ec-48aa-a835-3b277ca4aae6)



Here is the flow:-

                 ┌───────────────┐
                 │   Browser /   │
                 │   Client UI   │
                 │ (EJS Pages)   │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    Routes     │
                 │ (usersRouter, │
                 │  ordersRouter,│
                 │  productsRouter,
                 │  adminRouter) │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  Middlewares  │
                 │ (isLoggedIn,  │
                 │  isAdmin)     │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  Controllers  │
                 │ (auth, cart,  │
                 │  order, user, │
                 │  product)     │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    Models     │
                 │ (user, order, │
                 │  product,     │
                 │  owner)       │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │     DB        │
                 │  (MongoDB)    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │     Utils     │
                 │ (mailer,      │
                 │  razorpay,    │
                 │  generateToken)│
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    Views      │
                 │  (EJS Pages)  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │   Browser /   │
                 │   Client UI   │
                 └───────────────┘
