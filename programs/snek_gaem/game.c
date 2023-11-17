#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

int x = 0;
int y = 0;
bool drawing = false;

int key_event_happened = 0;
int keycode = 0;

#define KEY_EVENT_NONE 0
#define KEY_EVENT_PRESSED 1
#define KEY_EVENT_RELEASED 2

#define KEYCODE_SPACE 1
#define KEYCODE_UP 2
#define KEYCODE_DOWN 3
#define KEYCODE_LEFT 4
#define KEYCODE_RIGHT 5

#define WIDTH 24
#define HEIGHT 18
void draw_rect_10x10(int x, int y, int color);

#define COLOR_ON 0xEEEEEE00
#define COLOR_OFF 0x11111100

int main(void)
{
    while (true) {
        if (key_event_happened == KEY_EVENT_PRESSED) {
            switch (keycode) {
                case KEYCODE_SPACE:
                    drawing = !drawing;
                    break;
                case KEYCODE_UP:
                    if (y > 0) {
                        y -= 1;
                    }
                    break;
                case KEYCODE_DOWN:
                    if (y < HEIGHT - 1) {
                        y += 1;
                    }
                    break;
                case KEYCODE_LEFT:
                    if (x > 0) {
                        x -= 1;
                    }
                    break;
                case KEYCODE_RIGHT:
                    if (x < WIDTH - 1) {
                        x += 1;
                    }
                    break;
            }
            key_event_happened = KEY_EVENT_NONE;
        }
        if (drawing) {
            draw_rect_10x10(x, y, COLOR_ON);
        } else {
            draw_rect_10x10(x, y, COLOR_OFF);
        }
    }
}
