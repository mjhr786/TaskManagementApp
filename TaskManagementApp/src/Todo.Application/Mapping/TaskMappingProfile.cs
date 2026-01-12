
using AutoMapper;
using Todo.Application.Tasks.Dtos;
using Todo.Domain.Entities;

namespace Todo.Application.Mapping;

public class TaskMappingProfile : Profile
{
    public TaskMappingProfile()
    {
        // Entity -> ViewModel
        // CreateMap<TaskItem, TaskVm>()
        //     .ForMember(d => d.TotalHours, opt => opt.MapFrom(s => s.TimeLogs.Sum(l => l.Hours)));

        CreateMap<TaskItem, TaskVm>()
            .ForCtorParam("Id", opt => opt.MapFrom(s => s.Id))
            .ForCtorParam("Title", opt => opt.MapFrom(s => s.Title))
            .ForCtorParam("Description", opt => opt.MapFrom(s => s.Description))
            .ForCtorParam("StartDate", opt => opt.MapFrom(s => s.StartDate))
            .ForCtorParam("EndDate", opt => opt.MapFrom(s => s.EndDate))
            .ForCtorParam("CreatedDate", opt => opt.MapFrom(s => s.CreatedDate))
            .ForCtorParam("Status", opt => opt.MapFrom(s => s.Status))
            .ForCtorParam("TotalHours", opt => opt.MapFrom(s => s.TimeLogs.Sum(l => l.Hours)));
        
        // Create DTO -> Entity (needs userId at runtime)
        CreateMap<CreateTaskDto, TaskItem>()
            .ConstructUsing((src, ctx) =>
            {
                if (!ctx.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
                    throw new ArgumentException("UserId missing in mapping context Items");

                return new TaskItem(userId, src.Title, src.StartDate, src.EndDate, src.Description);
            });

        // Update DTO -> Entity is not a full re-map; we’ll apply changes via domain method
        // If you prefer, you can map onto existing instance:
        CreateMap<UpdateTaskDto, TaskItem>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }
}
