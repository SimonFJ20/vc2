#include <array>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <mutex>
#include <thread>

template <typename T> using Ref = std::reference_wrapper<T>;

struct VRAM {
    constexpr void set(size_t x, size_t y, uint32_t data)
    {
        this->ram[y * 240 + x] = data;
    }
    constexpr uint32_t get(size_t x, size_t y)
    {
        return this->ram[y * 240 + x];
    }

    std::array<uint32_t, 240 * 180> ram;
    std::mutex mutex;
};
struct Keeboord {
    enum class Event { None, Pressed, Released };

    Event key_event;
    uint32_t keycode;
    bool event_occured = false;
    std::mutex mutex;
};
struct Inspector {
    Keeboord keeboord;
    VRAM vram;
};

struct SDL2Context {
    /* sdl init stuff ig */
    void update_and_render()
    {
        /* poll sdl events */
        {
            auto vram_lock = std::lock_guard(this->inspector.get().vram);
            for (size_t y = 0; y < 180; ++y) {
                for (size_t x = 0; x < 240; ++x) {
                    auto pixel = this->inspector.get().vram.get(x, y);
                    /* set color */
                    /* draw rectangles with sdl */
                }
            }
        }
        if (/*kee pressed or smthn*/) {
            auto keeboord_lock
                = std::lock_guard(this->inspector.get().keeboord);
            this->inspector.get().keeboord.event_occured = true;
            this->inspector.get().keeboord.key_event = Keeboord::Event::Pressed;
            this->inspector.get().keeboord.keycode = /* scancode or somthn */;
        }
    }
    Ref<Inspector> inspector;
    /* sdl stuff */
};
void render_bingbong(Ref<Inspector> inspector)
{
    auto context = SDL2Context { inspector };
    while (true) {
        context.update_and_render();
        std::this_thread::sleep_for(std::chrono::milliseconds(6));
    }
}
int main()
{
    auto inspector = Inspector();
    auto render_thread
        = std::thread([&]() { render_bingbong(std::ref(inspector)); });
    auto ram = std::array<uint8_t, 0x4000> { /* ... */ };
    uint32_t pc = 0;
    while (pc < ram.size()) {
        {
            auto keeboord_lock = std::lock_guard(inspector.keeboord);
            if (inspector.keeboord.event_occured) {
                inspector.keeboord.event_occured = false;
                /* handle keeboord stuff */
                if (/* if interrupt is set */) {
                    /* pc = ram[interrupt_addr]; */
                }
            }
        }
        if (/* instruction dest is memory */) {
            auto dest_addr = /* ... */;
            auto source_value = /* ... */;
            if (within(dest_addr, /* vram mapping */)) {
                auto vram_lock = std::lock_guard(inspector.vram);
                inspector.vram.ram[dest_addr - vram_offset] = source_value;
            }
        }
    }
}
